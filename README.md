<!-- ================= HEADER ================= -->
<h1 align="center">🛡️ CareGuard AI</h1>
<h3 align="center">Smart Fall Detection & Daily Assistance System for Elderly</h3>

<p align="center">
  <img src="https://readme-typing-svg.demolab.com?font=Fira+Code&size=24&duration=2500&pause=800&color=00F7FF&center=true&vCenter=true&width=700&lines=AI+Powered+Healthcare+System;IoT+%2B+TinyML+%2B+Mobile+App;Real-time+Fall+Detection+%26+Alerts;Built+for+Elderly+Safety+%F0%9F%9A%80" />
</p>

---

<!-- ================= BADGES ================= -->
<p align="center">
  <img src="https://img.shields.io/badge/Project-IoT%20Healthcare-blue?style=for-the-badge"/>
  <img src="https://img.shields.io/badge/AI-TinyML-green?style=for-the-badge"/>
  <img src="https://img.shields.io/badge/Mobile-React%20Native-purple?style=for-the-badge"/>
  <img src="https://img.shields.io/badge/Backend-Node.js-yellow?style=for-the-badge"/>
  <img src="https://img.shields.io/badge/Database-NeonDB-orange?style=for-the-badge"/>
</p>

<p align="center">
  <img src="https://img.shields.io/github/stars/your-username/careguard-ai?style=social"/>
  <img src="https://img.shields.io/github/forks/your-username/careguard-ai?style=social"/>
  <img src="https://img.shields.io/github/license/your-username/careguard-ai"/>
</p>

---

<!-- ================= BANNER ================= -->
<p align="center">
  <img src="images/banner.png" width="850"/>
</p>

---

## 🚀 Overview  

CareGuard AI is an **IoT + AI-based healthcare solution** designed to ensure the safety and independence of elderly individuals.

### 🔥 Key Features
- 🚨 Real-time fall detection  
- 📲 Instant alerts  
- 💊 Medication reminders  
- 💧 Hydration tracking  
- 🤖 AI prescription assistant  
- 📊 Health dashboard  

---

## ❗ Problem Statement  

- Falls are a major cause of injury among elderly  
- Delay in response can be dangerous  
- Lack of real-time monitoring  

👉 A **smart automated system** is required  

---

## 💡 Solution  

CareGuard integrates **hardware + AI + mobile app**:

- 📡 ESP32 + MPU6050 wearable  
- 🧠 TinyML model for fall detection  
- 📱 Mobile app for monitoring  
- ☁️ Cloud alerts system  

---


---

## 🧠 AI Model  

- Model: **1D CNN (TinyML)**  
- Input: **6-axis IMU data**  
- Window: **100 samples (~2 sec)**  
- Output: **Fall probability**  

⚡ Optimized using TensorFlow Lite  

---

## ⚙️ Tech Stack  

| Category | Tech |
|--------|------|
| Hardware | ESP32, MPU6050 |
| AI/ML | TensorFlow Lite |
| App | React Native |
| Backend | Node.js |
| Database | Neon DB |
| APIs | Blynk, WhatsApp |

---

## 📊 Dataset  

- **WEDA-FALL Dataset**  
- 50Hz sampling  
- Real-world wrist-based data  
- Age: 20–95  

## 📸 App Screenshots  

<div align="center" style="overflow-x: auto; white-space: nowrap;">
  <img src="images/home.jpeg" width="220"/>
  <img src="images/ai.jpeg" width="220"/>
  <img src="images/aian.jpeg" width="220"/>
  <img src="images/prescription.jpeg" width="220"/>
  <img src="images/setting.jpeg" width="220"/>
  <img src="images/scan.jpeg" width="220"/>
</div>




---

## 🏗️ System Architecture  

<p align="center">
  <img src="images/care.png" width="700"/>
</p>

---
## 👥 Team & Responsibilities  

#### 👩‍💻 Simranpreet Kaur – Machine Learning & TinyML  
- Designed and trained 1D CNN model for real-time fall detection  
- Performed TensorFlow Lite conversion and INT8 quantization  
- Deployed optimized TinyML model on ESP32 for edge inference  
- Tuned model for latency, memory efficiency, and accuracy  

#### 🔧 Harmanpreet Singh – Hardware & Embedded Systems  
- Integrated MPU6050 (6-axis IMU) with ESP32 wearable device  
- Implemented real-time motion data acquisition and firmware logic  
- Managed embedded system deployment and hardware optimization  

#### 📱 Mohit Ranjan – Mobile App & Backend Development  
- Developed CareGuard mobile application using React Native  
- Built backend services using Node.js and integrated Neon DB  
- Implemented AI-based medicine image analysis (uses & side effects)  
- Integrated WhatsApp API for emergency alert notifications  

---
## 📁 Project Structure  

```bash
Minor Project/
├── CareGuard/
├── CareGuard-Backend/
├── esp32_ml_project/
├── images/
└── README.md
