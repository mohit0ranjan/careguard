#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <Wire.h>

#include <WiFi.h>
#include <HTTPClient.h>
#include <tflm_esp32.h>

#include "model_data.h"
#include "scaler_params.h"

// ================= WIFI CONFIG =================
const char* ssid = "mohitranjan143";
const char* password = "12345678";

// ================= BACKEND CONFIG =================
const char* backendHost = "care-guard-backend.vercel.app";

unsigned long lastHeartbeatTime = 0;
const unsigned long heartbeatInterval = 3000; // Send heartbeat every 3 seconds

String currentStatus = "Status: Stable";

// ================= CONFIG =================
#define WINDOW_SIZE 100
#define NUM_CHANNELS 6
#define NUMBER_OF_INPUTS (WINDOW_SIZE * NUM_CHANNELS)

constexpr int kTensorArenaSize = 64 * 1024; // Increased for safety

// ================= GLOBALS =================
Adafruit_MPU6050 mpu;

float input_buffer[NUMBER_OF_INPUTS];
int current_sample = 0;

uint8_t tensor_arena[kTensorArenaSize];

tflite::MicroInterpreter* interpreter;
TfLiteTensor* input;
TfLiteTensor* output;

// ================= SETUP =================
void setup() {
    Serial.begin(115200);
    delay(1000);

    Serial.println("ESP32 Fall Detection Init...");

    // Connect to WiFi
    WiFi.begin(ssid, password);
    Serial.print("Connecting to WiFi");
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    }
    Serial.println("\nConnected to WiFi!");

    // MPU6050 init
    if (!mpu.begin()) {
        Serial.println("MPU6050 not found!");
        while (1);
    }

    mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
    mpu.setGyroRange(MPU6050_RANGE_500_DEG);
    mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);

    Serial.println("MPU6050 Ready");

    // ================= TFLITE INIT =================
    const tflite::Model* model = tflite::GetModel(model_data);

    // Large capacity to hold EVERY common operation to avoid further errors
    static tflite::MicroMutableOpResolver<40> resolver;
    resolver.AddFullyConnected();
    resolver.AddConv2D();
    resolver.AddDepthwiseConv2D();
    resolver.AddReshape();
    resolver.AddSoftmax();
    resolver.AddQuantize();
    resolver.AddDequantize();
    resolver.AddExpandDims();
    resolver.AddMaxPool2D();
    resolver.AddAveragePool2D();
    resolver.AddAdd();
    resolver.AddSub();
    resolver.AddMul();
    resolver.AddDiv();
    resolver.AddRelu();
    resolver.AddRelu6();
    resolver.AddLeakyRelu();
    resolver.AddMean();
    resolver.AddPad();
    resolver.AddSqueeze();
    resolver.AddLogistic();
    resolver.AddShape();
    resolver.AddStridedSlice(); // Fixed: Added the missing op
    resolver.AddSlice();        // Added for safety
    resolver.AddConcatenation();
    resolver.AddTranspose();
    resolver.AddPack();
    resolver.AddUnpack();
    resolver.AddMinimum();
    resolver.AddMaximum();
    resolver.AddCast();

    static tflite::MicroInterpreter static_interpreter(
        model,
        resolver,
        tensor_arena,
        kTensorArenaSize
    );

    interpreter = &static_interpreter;

    if (interpreter->AllocateTensors() != kTfLiteOk) {
        Serial.println("Tensor allocation failed!");
        while (1);
    }

    input = interpreter->input(0);
    output = interpreter->output(0);

    Serial.println("Model Loaded!");
}

// ================= LOOP =================
void loop() {
    sensors_event_t a, g, temp;
    mpu.getEvent(&a, &g, &temp);

    // Raw sensor data
    float raw_data[6] = {
        a.acceleration.x,
        a.acceleration.y,
        a.acceleration.z,
        g.gyro.x,
        g.gyro.y,
        g.gyro.z
    };

    // Apply scaling
    float scaled_data[6];
    for (int i = 0; i < 6; i++) {
        scaled_data[i] = (raw_data[i] - scaler_mean[i]) / scaler_std[i];
    }

    // Fill buffer
    int offset = current_sample * NUM_CHANNELS;
    for (int i = 0; i < NUM_CHANNELS; i++) {
        input_buffer[offset + i] = scaled_data[i];
    }

    current_sample++;

    // ================= INFERENCE =================
    if (current_sample >= WINDOW_SIZE) {

        // Copy input to model
        for (int i = 0; i < NUMBER_OF_INPUTS; i++) {
            input->data.f[i] = input_buffer[i];
        }

        // Run inference
        if (interpreter->Invoke() != kTfLiteOk) {
            Serial.println("Inference failed!");
            return;
        }

        float prediction = output->data.f[0];

        // ===== DYNAMIC MOVEMENT CHECK =====
        // To prevent false positives when device is static (upside down, sleeping),
        // we calculate the peak-to-peak difference in the sensor data window.
        float max_a_x = -1000, min_a_x = 1000;
        float max_a_y = -1000, min_a_y = 1000;
        float max_a_z = -1000, min_a_z = 1000;
        float max_g_x = -1000, min_g_x = 1000;
        float max_g_y = -1000, min_g_y = 1000;
        float max_g_z = -1000, min_g_z = 1000;

        for (int i = 0; i < WINDOW_SIZE; i++) {
            float ax = input_buffer[i * NUM_CHANNELS + 0];
            float ay = input_buffer[i * NUM_CHANNELS + 1];
            float az = input_buffer[i * NUM_CHANNELS + 2];
            float gx = input_buffer[i * NUM_CHANNELS + 3];
            float gy = input_buffer[i * NUM_CHANNELS + 4];
            float gz = input_buffer[i * NUM_CHANNELS + 5];

            if (ax > max_a_x) max_a_x = ax;
            if (ax < min_a_x) min_a_x = ax;
            if (ay > max_a_y) max_a_y = ay;
            if (ay < min_a_y) min_a_y = ay;
            if (az > max_a_z) max_a_z = az;
            if (az < min_a_z) min_a_z = az;
            if (gx > max_g_x) max_g_x = gx;
            if (gx < min_g_x) min_g_x = gx;
            if (gy > max_g_y) max_g_y = gy;
            if (gy < min_g_y) min_g_y = gy;
            if (gz > max_g_z) max_g_z = gz;
            if (gz < min_g_z) min_g_z = gz;
        }

        float diff_a_x = max_a_x - min_a_x;
        float diff_a_y = max_a_y - min_a_y;
        float diff_a_z = max_a_z - min_a_z;
        float diff_g_x = max_g_x - min_g_x;
        float diff_g_y = max_g_y - min_g_y;
        float diff_g_z = max_g_z - min_g_z;

        float max_accel_change = diff_a_x;
        if (diff_a_y > max_accel_change) max_accel_change = diff_a_y;
        if (diff_a_z > max_accel_change) max_accel_change = diff_a_z;

        float max_gyro_change = diff_g_x;
        if (diff_g_y > max_gyro_change) max_gyro_change = diff_g_y;
        if (diff_g_z > max_gyro_change) max_gyro_change = diff_g_z;

        // Threshold of 1.0 in scaled units ensures that the sensor experienced 
        // a change of at least ~0.5g or ~1.5 rad/s. If not, it means the user 
        // is likely just resting statically (e.g. sleeping) or upside down.
        bool has_movement = (max_accel_change > 1.0) || (max_gyro_change > 1.0);

        if (!has_movement) {
            // Force prediction to very low if there was no substantial movement
            prediction = 0.0;
        }
        
        // DEBUG: See what the AI is seeing at the moment of prediction
        Serial.print("Window End Scaled [Ax,Ay,Az]: ");
        Serial.print(scaled_data[0]); Serial.print(", ");
        Serial.print(scaled_data[1]); Serial.print(", ");
        Serial.println(scaled_data[2]);

        Serial.print(">>> Fall Probability: ");
        Serial.print(prediction * 100);
        Serial.println("%");

        bool fallDetected = false;

        if (prediction > 0.90) { // Increased threshold
            Serial.println(">> 🚨 FALL DETECTED 🚨 <<");
            currentStatus = "Status: Fall Detected";
            fallDetected = true;
        } else if (prediction < 0.3) {
            Serial.println("State: Stable/Normal");
            currentStatus = "Status: Stable";
        } else {
            Serial.println("State: Moving/Uncertain");
            currentStatus = "Status: Moving";
        }

        if (fallDetected) {
            sendPostRequest("/api/device/alert", "{\"fallDetected\":true, \"status\":\"Status: Fall Detected\"}");
            delay(5000); 
        }

        // Sliding window
        int shift = 50;
        int remain = WINDOW_SIZE - shift;
        memmove(input_buffer, input_buffer + shift * NUM_CHANNELS, remain * NUM_CHANNELS * sizeof(float));
        current_sample = remain;
    }

    // 3. SEND HEARTBEAT EVERY 3 SECONDS
    if (millis() - lastHeartbeatTime >= heartbeatInterval) {
        String payload = "{\"status\":\"" + currentStatus + "\"}";
        sendPostRequest("/api/device/heartbeat", payload);
        lastHeartbeatTime = millis();
    }

    delay(20); 
}

// ---------------------------------------------------------
// Helper function to send HTTP POST directly to Node Backend
// ---------------------------------------------------------
void sendPostRequest(String endpoint, String jsonPayload) {
    if (WiFi.status() == WL_CONNECTED) {
        HTTPClient http;
        String url = "https://" + String(backendHost) + endpoint;
        
        http.begin(url);
        http.addHeader("Content-Type", "application/json");
        http.setTimeout(1000); // 1-second timeout so we don't freeze sensor readings if backend is slow
        
        int httpResponseCode = http.POST(jsonPayload);
        
        if (httpResponseCode > 0) {
            Serial.print("HTTP Response code (" + endpoint + "): ");
            Serial.println(httpResponseCode);
        } else {
            Serial.print("Error sending POST (" + endpoint + "): ");
            Serial.println(http.errorToString(httpResponseCode).c_str());
        }
        
        http.end();
    } else {
        Serial.println("Error: WiFi Disconnected");
    }
}