import os
import pandas as pd
import numpy as np
import tensorflow as tf
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from tensorflow.keras import layers, models

# --- Configuration ---
WINDOW_SIZE = 100  # 2 seconds at 50Hz
STEP_SIZE = 50     # 1 second overlap
DATA_DIR = "50Hz"
MODEL_NAME = "fall_detection_model"
TFLITE_MODEL = "model.tflite"
HEADER_FILE = "model_data.h"
SCALER_FILE = "scaler_params.h"

def load_data():
    print("Loading dataset...")
    X = []
    y = []
    
    categories = sorted(os.listdir(DATA_DIR))
    for folder in categories:
        folder_path = os.path.join(DATA_DIR, folder)
        if not os.path.isdir(folder_path): continue
        
        # Label: 1 for Fall (F01-F08), 0 for ADL (D01-D11)
        label = 1 if folder.startswith('F') else 0
        
        # Find all unique trials (Uxx_Rxx)
        trials = set()
        for f in os.listdir(folder_path):
            if f.endswith('_accel.csv'):
                trials.add(f.replace('_accel.csv', ''))
        
        for trial in trials:
            accel_path = os.path.join(folder_path, f"{trial}_accel.csv")
            gyro_path = os.path.join(folder_path, f"{trial}_gyro.csv")
            
            if not os.path.exists(gyro_path): continue
            
            try:
                df_accel = pd.read_csv(accel_path)
                df_gyro = pd.read_csv(gyro_path)
                
                # Check column names (based on WEDA-FALL structure)
                # accel_x_list, accel_y_list, accel_z_list
                # gyro_x_list, gyro_y_list, gyro_z_list
                
                acc_cols = ['accel_x_list', 'accel_y_list', 'accel_z_list']
                gyro_cols = ['gyro_x_list', 'gyro_y_list', 'gyro_z_list']
                
                accel_data = df_accel[acc_cols].values
                gyro_data = df_gyro[gyro_cols].values
                
                min_len = min(len(accel_data), len(gyro_data))
                combined = np.hstack((accel_data[:min_len], gyro_data[:min_len]))
                
                # Windowing
                for i in range(0, len(combined) - WINDOW_SIZE, STEP_SIZE):
                    window = combined[i:i+WINDOW_SIZE]
                    X.append(window)
                    y.append(label)
            except Exception as e:
                print(f"Error processing {trial} in {folder}: {e}")
                
    return np.array(X), np.array(y)

def build_model(input_shape):
    model = models.Sequential([
        layers.Input(shape=input_shape),
        layers.Conv1D(16, 3, activation='relu', padding='same'),
        layers.MaxPooling1D(2),
        layers.Conv1D(32, 3, activation='relu', padding='same'),
        layers.MaxPooling1D(2),
        layers.Flatten(),
        layers.Dropout(0.3),
        layers.Dense(16, activation='relu'),
        layers.Dense(1, activation='sigmoid')
    ])
    model.compile(optimizer='adam', loss='binary_crossentropy', metrics=['accuracy'])
    return model

def export_to_header(tflite_model, filename):
    with open(filename, 'w') as f:
        f.write("#ifndef MODEL_DATA_H\n#define MODEL_DATA_H\n\n")
        f.write(f"const unsigned char model_data[] = {{")
        for i, byte in enumerate(tflite_model):
            if i % 12 == 0: f.write("\n  ")
            f.write(f"0x{byte:02x}, ")
        f.write("\n};\n")
        f.write(f"const unsigned int model_data_len = {len(tflite_model)};\n\n")
        f.write("#endif\n")

def export_scaler(scaler, filename):
    with open(filename, 'w') as f:
        f.write("#ifndef SCALER_PARAMS_H\n#define SCALER_PARAMS_H\n\n")
        f.write("const float scaler_mean[] = {")
        f.write(", ".join([str(x) for x in scaler.mean_]))
        f.write("};\n")
        f.write("const float scaler_std[] = {")
        f.write(", ".join([str(x) for x in np.sqrt(scaler.var_)]))
        f.write("};\n\n")
        f.write("#endif\n")

def main():
    # 1. Load data
    X, y = load_data()
    print(f"Dataset loaded: {X.shape[0]} windows, {X.shape[1]} time steps, {X.shape[2]} features")
    
    # 2. Scale features
    # Flatten to scale, then reshape back
    num_windows, time_steps, num_features = X.shape
    X_flat = X.reshape(-1, num_features)
    scaler = StandardScaler()
    X_flat_scaled = scaler.fit_transform(X_flat)
    X_scaled = X_flat_scaled.reshape(num_windows, time_steps, num_features)
    
    # Export scaler for ESP32
    export_scaler(scaler, SCALER_FILE)
    print(f"Scaler exported to {SCALER_FILE}")
    
    # 3. Train-Test Split
    X_train, X_test, y_train, y_test = train_test_split(X_scaled, y, test_size=0.2, random_state=42)
    
    # 4. Build and Train
    model = build_model((WINDOW_SIZE, 6))
    model.summary()
    
    print("Training model...")
    model.fit(X_train, y_train, epochs=20, batch_size=32, validation_split=0.1, verbose=1)
    
    # 5. Evaluate
    loss, acc = model.evaluate(X_test, y_test)
    print(f"Test Accuracy: {acc*100:.2f}%")
    
    # 6. Convert to TFLite (with Quantization)
    print("Converting to TFLite...")
    
    # Representative dataset for quantization
    def representative_dataset():
        for i in range(100):
            yield [X_test[i:i+1].astype(np.float32)]

    converter = tf.lite.TFLiteConverter.from_keras_model(model)
    converter.optimizations = [tf.lite.Optimize.DEFAULT]
    converter.representative_dataset = representative_dataset
    # Ensure fully quantized
    converter.target_spec.supported_ops = [tf.lite.OpsSet.TFLITE_BUILTINS_INT8]
    converter.inference_input_type = tf.float32  # Keep float for easier ESP32 handling or use int8
    converter.inference_output_type = tf.float32
    
    # Disable per-channel quantization for compatibility with ESP32 TFLM
    converter._experimental_disable_per_channel_quantization_for_dense_layers = True
    
    tflite_model = converter.convert()
    
    # Save .tflite
    with open(TFLITE_MODEL, 'wb') as f:
        f.write(tflite_model)
    print(f"Model saved to {TFLITE_MODEL} ({len(tflite_model)/1024:.2f} KB)")
    
    # 7. Export to C Header
    export_to_header(tflite_model, HEADER_FILE)
    print(f"Model exported to {HEADER_FILE}")

if __name__ == "__main__":
    main()
