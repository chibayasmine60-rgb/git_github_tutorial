from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import tensorflow as tf
import joblib
import numpy as np
import pandas as pd

app = FastAPI(
    title="Algeria Drought Prediction API",
    description="AI-powered drought prediction using LSTM, SPEI and ERA5-Land climate data",
    version="1.0.0"
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =====================================================
# Paths
# =====================================================

MODEL_PATH = "model/best_model_two_dataset.keras"
FEATURE_SCALER_PATH = "model/feature_scaler.pkl"
TARGET_SCALER_PATH = "model/target_scaler.pkl"
DATASET_PATH = "data/df_final.csv"

# =====================================================
# Features used during training
# =====================================================

FEATURES = [
    "spei",
    "Month_sin",
    "Month_cos",
    "lat",
    "lon",
    "t2m",
    "tp",
    "swvl1"
]

WINDOW_SIZE = 24

# =====================================================
# Request model
# =====================================================

class PredictionRequest(BaseModel):
    data: list[list[float]]

# =====================================================
# Load trained ML components
# =====================================================

model = tf.keras.models.load_model(MODEL_PATH)

feature_scaler = joblib.load(FEATURE_SCALER_PATH)

target_scaler = joblib.load(TARGET_SCALER_PATH)

print("======================================")
print("ML components loaded successfully")
print("======================================")
print("Model input shape:", model.input_shape)
print("Number of features:", len(FEATURES))
print("Features:", FEATURES)

# =====================================================
# Routes
# =====================================================

@app.get("/")
def home():
    return {
        "message": "Algeria Drought Prediction API is running 🚀"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "model_loaded": model is not None,
        "feature_scaler_loaded": feature_scaler is not None,
        "target_scaler_loaded": target_scaler is not None
    }


@app.get("/model-info")
def model_info():
    return {
        "model": "Baseline LSTM",
        "window_size": WINDOW_SIZE,
        "number_of_features": len(FEATURES),
        "features": FEATURES,
        "input_shape": str(model.input_shape)
    }

# =====================================================
# Drought recommendation
# =====================================================

def get_drought_recommendation(spei: float):

    if spei >= -0.5:
        return {
            "drought_level": "No drought",
            "severity": "Normal",
            "recommendation": (
                "No significant drought conditions are predicted. "
                "Continue monitoring rainfall and soil moisture."
            )
        }

    elif spei >= -1.0:
        return {
            "drought_level": "Mild drought",
            "severity": "Mild",
            "recommendation": (
                "Monitor water resources and soil moisture. "
                "Consider reducing unnecessary water consumption."
            )
        }

    elif spei >= -1.5:
        return {
            "drought_level": "Moderate drought",
            "severity": "Moderate",
            "recommendation": (
                "Implement water conservation measures and closely monitor "
                "agricultural areas and water availability."
            )
        }

    elif spei >= -2.0:
        return {
            "drought_level": "Severe drought",
            "severity": "Severe",
            "recommendation": (
                "Activate drought-management measures. Prioritize drinking "
                "water and essential agricultural needs and reduce irrigation."
            )
        }

    else:
        return {
            "drought_level": "Extreme drought",
            "severity": "Extreme",
            "recommendation": (
                "Immediate drought-response measures are recommended. "
                "Prioritize critical water resources and implement strict "
                "water-use restrictions."
            )
        }

# =====================================================
# Prediction using manually provided 24 x 8 data
# =====================================================

@app.post("/predict")
def predict(request: PredictionRequest):

    # Convert input to NumPy array
    data = np.array(request.data, dtype=np.float32)

    # Check shape
    expected_shape = (WINDOW_SIZE, len(FEATURES))

    if data.shape != expected_shape:
        return {
            "error": (
                f"Expected shape {expected_shape}, "
                f"but received {data.shape}"
            )
        }

    # Scale features
    data_scaled = feature_scaler.transform(data)

    # Add batch dimension
    # (24, 8) -> (1, 24, 8)
    data_scaled = np.expand_dims(data_scaled, axis=0)

    # LSTM prediction
    prediction_scaled = model.predict(
        data_scaled,
        verbose=0
    )

    # Convert back to original SPEI scale
    prediction = target_scaler.inverse_transform(
        prediction_scaled
    )

    predicted_spei = float(prediction[0, 0])

    # Get drought recommendation
    recommendation = get_drought_recommendation(
        predicted_spei
    )

    return {
        "predicted_spei": predicted_spei,
        "drought_level": recommendation["drought_level"],
        "severity": recommendation["severity"],
        "recommendation": recommendation["recommendation"]
    }

# =====================================================
# Prediction based on latitude and longitude
# =====================================================

@app.post("/predict-location")
def predict_location(
    latitude: float,
    longitude: float,
    target_date: str
):
    # Load dataset
    df = pd.read_csv(DATASET_PATH)

    # Convert dates
    df["time_x"] = pd.to_datetime(df["time_x"])

    # Convert requested date
    try:
        target_date = pd.to_datetime(target_date)
    except Exception:
        return {
            "error": "Invalid date format. Use YYYY-MM-DD."
        }

    # Find nearest grid point
    df["distance"] = (
        (df["lat"] - latitude) ** 2
        + (df["lon"] - longitude) ** 2
    )

    nearest_index = df["distance"].idxmin()

    nearest_lat = df.loc[nearest_index, "lat"]
    nearest_lon = df.loc[nearest_index, "lon"]

    # Keep only nearest grid point
    location_df = df[
        (df["lat"] == nearest_lat)
        & (df["lon"] == nearest_lon)
    ].copy()

    # Sort chronologically
    location_df = location_df.sort_values("time_x")

    # =================================================
    # Select data up to requested target date
    # =================================================

    historical_data = location_df[
        location_df["time_x"] <= target_date
    ].copy()

    # Need at least 24 months
    if len(historical_data) < WINDOW_SIZE:
        return {
            "error": (
                "Not enough historical data before the "
                "requested date for a 24-month prediction window."
            )
        }

    # Last 24 months before/including target date
    recent_data = historical_data.iloc[-WINDOW_SIZE:].copy()

    # =================================================
    # Prepare model input
    # =================================================

    X = recent_data[FEATURES].astype(np.float32)

    # Scale features
    X_scaled = feature_scaler.transform(X)

    # Add batch dimension
    # (24, 8) -> (1, 24, 8)
    X_scaled = np.expand_dims(X_scaled, axis=0)

    # =================================================
    # LSTM prediction
    # =================================================

    prediction_scaled = model.predict(
        X_scaled,
        verbose=0
    )

    # Convert prediction back to original SPEI scale
    prediction = target_scaler.inverse_transform(
        prediction_scaled
    )

    predicted_spei = float(
        prediction[0, 0]
    )

    # =================================================
    # Drought recommendation
    # =================================================

    recommendation = get_drought_recommendation(
        predicted_spei
    )

    # =================================================
    # Return result
    # =================================================

    return {
        "requested_location": {
            "latitude": latitude,
            "longitude": longitude
        },

        "target_date": target_date.strftime("%Y-%m-%d"),

        "nearest_grid_location": {
            "latitude": float(nearest_lat),
            "longitude": float(nearest_lon)
        },

        "input_window": {
            "start": recent_data["time_x"].min().strftime("%Y-%m-%d"),
            "end": recent_data["time_x"].max().strftime("%Y-%m-%d"),
            "months": len(recent_data)
        },

        "predicted_spei": predicted_spei,

        "drought_level": recommendation["drought_level"],

        "severity": recommendation["severity"],

        "recommendation": recommendation["recommendation"]
    }