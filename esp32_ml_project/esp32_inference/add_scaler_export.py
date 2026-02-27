import json
import os

notebook_path = "WEDA+1D CNN.ipynb"

def create_scaler_export_cell():
    return {
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [
            "# Export Scaler Parameters for ESP32\n",
            "if 'scaler' in locals():\n",
            "    print(\"// Scaler Parameters for ESP32\")\n",
            "    print(f\"const float scaler_mean[] = {{{', '.join(map(str, scaler.mean_))}}};\")\n",
            "    print(f\"const float scaler_std[] = {{{', '.join(map(str, scaler.scale_))}}};\")\n",
            "    \n",
            "    with open('scaler_params.h', 'w') as f:\n",
            "        f.write(\"// Scaler Parameters\\n\")\n",
            "        f.write(f\"const float scaler_mean[] = {{{', '.join(map(str, scaler.mean_))}}};\\n\")\n",
            "        f.write(f\"const float scaler_std[] = {{{', '.join(map(str, scaler.scale_))}}};\\n\")\n",
            "    print(\"\\nscaler_params.h created.\")\n",
            "else:\n",
            "    print(\"Scaler object not found. Make sure you have run the scaling cells.\")"
        ]
    }

if os.path.exists(notebook_path):
    with open(notebook_path, "r", encoding="utf-8") as f:
        nb = json.load(f)
    
    # Insert before the last two export cells (which I added last time)
    # Actually just appending is fine.
    nb["cells"].append(create_scaler_export_cell())
    
    with open(notebook_path, "w", encoding="utf-8") as f:
        json.dump(nb, f, indent=1)
    print("Scaler export cell added to notebook.")
