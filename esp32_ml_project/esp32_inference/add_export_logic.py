import json
import os

notebook_path = "WEDA+1D CNN.ipynb"

def create_export_cells():
    cells = []
    
    # Cell 1: Convert to TFLite
    cells.append({
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [
            "import tensorflow as tf\n",
            "\n",
            "# Convert the model to TFLite format\n",
            "converter = tf.lite.TFLiteConverter.from_keras_model(model_tiny)\n",
            "converter.optimizations = [tf.lite.Optimize.DEFAULT]\n",
            "tflite_model = converter.convert()\n",
            "\n",
            "# Save the model\n",
            "with open('model.tflite', 'wb') as f:\n",
            "    f.write(tflite_model)\n",
            "\n",
            "print(f\"Model size: {len(tflite_model) / 1024:.2f} KB\")"
        ]
    })
    
    # Cell 2: Convert to C header for ESP32
    cells.append({
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [
            "def hex_to_c_array(hex_data, var_name):\n",
            "    c_str = f'const unsigned char {var_name}[] = {{'\n",
            "    for i, val in enumerate(hex_data):\n",
            "        if i % 12 == 0: c_str += '\\n  '\n",
            "        c_str += f'0x{val:02x}, '\n",
            "    c_str = c_str.strip(', ') + '\\n};\\n'\n",
            "    c_str += f'const unsigned int {var_name}_len = {len(hex_data)};'\n",
            "    return c_str\n",
            "\n",
            "with open('model_data.h', 'w') as f:\n",
            "    f.write(hex_to_c_array(tflite_model, 'model_data'))\n",
            "\n",
            "print(\"Model converted to model_data.h successfully!\")"
        ]
    })
    
    return cells

if os.path.exists(notebook_path):
    with open(notebook_path, "r", encoding="utf-8") as f:
        nb = json.load(f)
    
    # Keep original cells and append export cells
    nb["cells"].extend(create_export_cells())
    
    with open(notebook_path, "w", encoding="utf-8") as f:
        json.dump(nb, f, indent=1)
    print("Export cells added to notebook.")
else:
    print(f"File {notebook_path} not found.")
