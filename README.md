# 🇩🇿 Algeria Drought Prediction

An AI-powered drought prediction platform designed to help monitor and predict drought conditions across Algeria.

The platform uses an LSTM deep learning model, SPEI (Standardized Precipitation Evapotranspiration Index), and ERA5-Land climate data to analyze climate conditions and provide drought predictions and recommendations.

## 🌐 Live Website
       [Open Algeria Drought Prediction](https://scintillating-sparkle-production-368c.up.railway.app)

## Project Objective

The main goal of this project is to provide an accessible AI-based tool that can help:

- Monitor drought conditions in Algeria
- Predict future drought severity
- Analyze climate data for different locations
- Provide drought-level classifications
- Give recommendations related to water conservation and drought management
- Help farmers and other users make better decisions before drought conditions become severe

##  Current Coverage

⚠️ **Current version: Algeria only**

The platform currently supports locations within **Algeria**.

The current dataset contains historical climate information up to **2024**.

Therefore, the current version is mainly a prototype for demonstrating drought prediction using historical data.

##  AI Model

The platform uses a Long Short-Term Memory (LSTM) neural network.

The model uses 8 climate-related features:

- SPEI
- Month sine
- Month cosine
- Latitude
- Longitude
- Temperature (`t2m`)
- Total precipitation (`tp`)
- Soil moisture (`swvl1`)

The model uses a **24-month input window** to generate drought predictions.

## Data

The current dataset combines drought and climate information used to train and operate the prediction system.

The dataset is stored on Hugging Face:

            [Algeria Drought Dataset](https://huggingface.co/datasets/yasmine-ai/algeria-drought-data)

Current historical coverage:

**1901 – 2024**

##  Future Improvements

### 1.  Update the Dataset Automatically

One of the main future improvements is to automatically update the dataset when new climate data becomes available.

Instead of manually downloading and preparing new data, an AI/data agent could:

1. Detect newly available climate data
2. Download the new data
3. Clean and preprocess it
4. Add it to the existing dataset
5. Check data quality
6. Update the database
7. Prepare the new data for the AI model

This would allow the platform to continuously receive new information after 2024.

### 2.  AI Data Agent

A future version could include an intelligent data agent responsible for maintaining the platform's climate data.

The agent could automatically:

- Search for new climate datasets
- Download new observations
- Detect missing values
- Clean and transform the data
- Update the dataset
- Trigger model retraining when necessary
- Monitor the quality of the new data

This would reduce the need for manual data management.

### 3.  Farmer-Oriented Prediction

A future version will focus more on farmers and agricultural users.

Farmers could select their location and receive information about the expected drought conditions for upcoming periods.

The objective would be to provide an **early warning system**, allowing farmers to prepare before severe drought conditions occur.

Possible recommendations could include:

- Adjusting irrigation
- Reducing unnecessary water consumption
- Selecting more drought-resistant crops
- Planning agricultural activities
- Protecting water resources
- Preparing for periods of low precipitation

### 4.  Earlier Drought Warnings

The future system could move beyond historical analysis and provide predictions for upcoming months or seasons.

For example:

**Location → Future period → AI prediction → Drought risk → Recommendation**

This could help users prepare **before drought conditions become severe**.

### 5.  Real-Time and Future Climate Data

The current system stops at 2024.

Future versions could integrate continuously updated climate data so that users can obtain predictions based on the most recent observations.

The long-term objective is to transform the current prototype into a continuously updated drought early-warning platform.

### 6.  Expansion Beyond Algeria

The current project is specifically designed for **Algeria**.

In the future, the platform could be extended to other countries and regions affected by drought.

##  Technologies

- React
- FastAPI
- Python
- TensorFlow
- LSTM
- Pandas
- NumPy
- Leaflet
- SPEI
- ERA5-Land
- Hugging Face
- Railway

##  Architecture

```text
Climate Data
     ↓
Data Processing
     ↓
SPEI + ERA5-Land
     ↓
LSTM Model
     ↓
FastAPI Backend
     ↓
React Frontend
     ↓
Interactive Algeria Map
     ↓
Drought Prediction
     ↓
Recommendations
