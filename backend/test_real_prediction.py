import pandas as pd
import numpy as np
import tensorflow as tf
import joblib

# =========================
# Paths
# =========================

DATA_PATH = "data/df_final.csv"
MODEL_PATH = "model/best_model_two_dataset.keras"
FEATURE_SCALER_PATH = "model/feature_scaler.pkl"
TARGET_SCALER_PATH = "model/target_scaler.pkl"

# =========================
# Configuration
# =========================

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

# =========================
# Load data
# =========================

print("Loading dataset...")

df = pd.read_csv(DATA_PATH)

print("Dataset shape:", df.shape)
print("Columns:", df.columns.tolist())

# =========================
# Select one location
# =========================

LAT = 19.75
LON = -8.25

location_df = df[
    (df["lat"] == LAT) &
    (df["lon"] == LON)
].copy()

print("Location rows:", len(location_df))

# =========================
# Sort chronologically
# =========================

location_df["time_x"] = pd.to_datetime(location_df["time_x"])

location_df = location_df.sort_values("time_x")

# =========================
# Check enough data
# =========================

if len(location_df) < WINDOW_SIZE:
    raise ValueError(
        f"Not enough data. Found {len(location_df)} months."
    )

# =========================
# Take latest 24 months
# =========================

recent_data = location_df.iloc[-WINDOW_SIZE:].copy()

print("\nLatest 24 months:")
print(
    recent_data[
        ["time_x", "lat", "lon", "spei", "t2m", "tp", "swvl1"]
    ].tail()
)

# =========================
# Select model features
# =========================

X = recent_data[FEATURES].values.astype(np.float32)

print("\nInput shape before scaling:", X.shape)

# =========================
# Load scalers
# =========================

feature_scaler = joblib.load(FEATURE_SCALER_PATH)
target_scaler = joblib.load(TARGET_SCALER_PATH)

# =========================
# Scale features
# =========================

X_scaled = feature_scaler.transform(X)

# =========================
# Add batch dimension
# =========================

X_scaled = np.expand_dims(X_scaled, axis=0)

print("Input shape for LSTM:", X_scaled.shape)

# =========================
# Load model
# =========================

model = tf.keras.models.load_model(MODEL_PATH)

print("Model input shape:", model.input_shape)

# =========================
# Prediction
# =========================

prediction_scaled = model.predict(
    X_scaled,
    verbose=0
)

prediction = target_scaler.inverse_transform(
    prediction_scaled
)

predicted_spei = float(prediction[0, 0])

print("\n==============================")
print("REAL DATA PREDICTION")
print("==============================")
print("Location:", LAT, LON)
print("Predicted SPEI:", predicted_spei)