import { useEffect, useState } from "react";
import axios from "axios";
import L from "leaflet";
import windowImage from "./assets/images.jpg";
import locationImage from "./assets/pngtree-vector-location-icon-png-image_317888.jpg"
import { Sparkles } from "lucide-react";
import { CloudSun } from "lucide-react";

import {
  MapContainer,
  TileLayer,
  GeoJSON,
  CircleMarker,
  useMapEvents,
} from "react-leaflet";

import "leaflet/dist/leaflet.css";
import "./App.css";

const API_URL = "https://caring-charisma-production-d0b9.up.railway.app";
const MAP_CENTER = [28.0, 2.5];
const MAP_ZOOM = 5;

/* =========================================================
   MAP CLICK HANDLER
   ========================================================= */

function MapClickHandler({ onSelect }) {
  useMapEvents({
    click(event) {
      onSelect(event.latlng.lat, event.latlng.lng);
    },
  });

  return null;
}

/* =========================================================
   APP
   ========================================================= */

function App() {
  const [geoData, setGeoData] = useState(null);

  const [selectedWilaya, setSelectedWilaya] = useState(null);

  const [latitude, setLatitude] = useState(36.75);
  const [longitude, setLongitude] = useState(3.05);

  const [targetDate, setTargetDate] = useState("2024-12-16");

  const [prediction, setPrediction] = useState(null);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  /* =========================================================
     LOAD WILAYAS
     ========================================================= */

  useEffect(() => {
    fetch("/algeria-wilayas.geojson")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Unable to load Algeria wilayas.");
        }

        return response.json();
      })
      .then((data) => {
        setGeoData(data);
      })
      .catch((err) => {
        console.error(err);
        setError("Unable to load Algeria wilaya boundaries.");
      });
  }, []);

  /* =========================================================
     GET WILAYA NAME
     ========================================================= */

  const getWilayaName = (properties = {}) => {
    return (
      properties.name ||
      properties.NAME ||
      properties.Name ||
      properties.nom ||
      properties.NOM ||
      properties.Nom ||
      properties.wilaya ||
      properties.Wilaya ||
      properties.WILAYA ||
      properties.name_ar ||
      properties.NAME_AR ||
      properties.NOM_WILAYA ||
      properties.NOM_WILAYA_AR ||
      properties.Nom_Wilaya ||
      properties.NomWilaya ||
      properties.WILAYA_NAME ||
      properties.WILAYA_NAME_AR ||
      "Selected Wilaya"
    );
  };

  /* =========================================================
     REVERSE GEOCODING
     =========================================================
     Get the real name of a custom location from coordinates.
     ========================================================= */

  const getCustomLocationName = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=en`
      );

      if (!response.ok) {
        throw new Error("Reverse geocoding failed.");
      }

      const data = await response.json();

      const address = data.address || {};

      /*
        Try to obtain the most useful local name.
      */

      const name =
        address.city ||
        address.town ||
        address.village ||
        address.municipality ||
        address.suburb ||
        address.city_district ||
        address.county ||
        data.display_name;

      return name || "Custom location";
    } catch (err) {
      console.error("Reverse geocoding error:", err);

      return "Custom location";
    }
  };

  /* =========================================================
     SELECT LOCATION
     ========================================================= */

  const selectLocation = (name, lat, lng, isCustom = false) => {
    const cleanLat = Number(lat.toFixed(4));
    const cleanLng = Number(lng.toFixed(4));

    setLatitude(cleanLat);
    setLongitude(cleanLng);

    setSelectedWilaya({
      name,
      latitude: cleanLat,
      longitude: cleanLng,
      isCustom,
    });

    setPrediction(null);
    setError("");
  };

  /* =========================================================
     WILAYA CLICK
     ========================================================= */

  const handleWilayaClick = (event, feature) => {
    /*
      IMPORTANT:
      Stop the click from reaching the general
      map click handler.
    */

    if (event.originalEvent) {
      L.DomEvent.stopPropagation(event.originalEvent);
    }

    const { lat, lng } = event.latlng;

    const name = getWilayaName(feature.properties);

    selectLocation(name, lat, lng, false);
  };

  /* =========================================================
     CUSTOM MAP CLICK
     ========================================================= */

  const handleMapClick = async (lat, lng) => {
    /*
      Show the coordinates immediately.
      Then retrieve the real place name.
    */

    const cleanLat = Number(lat.toFixed(4));
    const cleanLng = Number(lng.toFixed(4));

    /*
      Temporary name while reverse geocoding is running.
    */

    selectLocation(
      "Finding location...",
      cleanLat,
      cleanLng,
      true
    );

    /*
      Get real location name.
    */

    const locationName = await getCustomLocationName(
      cleanLat,
      cleanLng
    );

    /*
      Update the selected location with
      the real name.
    */

    setSelectedWilaya({
      name: locationName,
      latitude: cleanLat,
      longitude: cleanLng,
      isCustom: true,
    });
  };

  /* =========================================================
     WILAYA STYLE
     ========================================================= */

  const wilayaStyle = {
    color: "#49e8c1",
    weight: 1,
    opacity: 0.65,
    fillColor: "#087f70",
    fillOpacity: 0.12,
  };

  /* =========================================================
     HOVER
     ========================================================= */

  const highlightFeature = (event) => {
    const layer = event.target;

    layer.setStyle({
      weight: 2,
      color: "#73ffe0",
      fillColor: "#19c9a5",
      fillOpacity: 0.28,
    });

    layer.bringToFront();
  };

  const resetFeature = (event) => {
    event.target.setStyle(wilayaStyle);
  };

  /* =========================================================
     GEOJSON INTERACTION
     ========================================================= */

  const onEachWilaya = (feature, layer) => {
    const name = getWilayaName(feature.properties);

    layer.bindTooltip(name, {
      sticky: true,
      direction: "top",
      opacity: 0.95,
    });

    layer.on({
      mouseover: highlightFeature,
      mouseout: resetFeature,

      click: (event) => {
        handleWilayaClick(event, feature);
      },
    });
  };

  /* =========================================================
     PREDICTION
     ========================================================= */

  const predictDrought = async () => {
    if (!latitude || !longitude || !targetDate) {
      setError("Please select a location and target date.");
      return;
    }

    setLoading(true);
    setPrediction(null);
    setError("");

    try {
      const response = await axios.post(
        `${API_URL}/predict-location`,
        null,
        {
          params: {
            latitude,
            longitude,
            target_date: targetDate,
          },
        }
      );

      setPrediction(response.data);
    } catch (err) {
      console.error(err);

      if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError(
          "Unable to connect to the drought prediction API."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  /* =========================================================
     SEVERITY
     ========================================================= */

  const getSeverityClass = (severity) => {
    if (!severity) return "normal";

    return severity
      .toLowerCase()
      .replace(/\s+/g, "-");
  };

  /* =========================================================
     SPEI COLOR
     ========================================================= */

  const getSpeiColor = (severity) => {
    const value = severity?.toLowerCase();

    if (value === "extreme") return "#ff4d67";
    if (value === "severe") return "#ff795e";
    if (value === "moderate") return "#ffb347";
    if (value === "mild") return "#ffe066";

    return "#42e8bd";
  };

  /* =========================================================
     SPEI GAUGE
     ========================================================= */

  const getGaugePercentage = () => {
    if (!prediction) return 0;

    const spei = Number(prediction.predicted_spei);

    /*
      Visual range:
      -3 = extreme drought
       0 = normal
      +3 = wet
    */

    const percentage = ((spei + 3) / 6) * 100;

    return Math.min(100, Math.max(0, percentage));
  };

  /* =========================================================
     RENDER
     ========================================================= */

  return (
    <div className="app">

      {/* =====================================================
          BACKGROUND DECORATION
          ===================================================== */}

      <div className="ambient ambient-one"></div>
      <div className="ambient ambient-two"></div>
      <div className="ambient ambient-three"></div>

      <div className="stars">
        <span></span>
        <span></span>
        <span></span>
        <span></span>
        <span></span>
        <span></span>
        <span></span>
        <span></span>
      </div>

      {/* =====================================================
          HEADER
          ===================================================== */}

      <header className="topbar glass">

        <div className="brand">

          <div className="brand-icon">
            🌿
          </div>

          <div>
            <h1>
              <span>DZ</span> Algeria Drought Prediction
            </h1>

            <p>
              AI-powered drought prediction using LSTM,
              SPEI and ERA5-Land climate data
            </p>
          </div>

        </div>

        <div className="system-status">
          <span className="status-dot"></span>
          AI MODEL ONLINE
        </div>

      </header>

      {/* =====================================================
          DASHBOARD
          ===================================================== */}

      <main className="dashboard">

        {/* ===================================================
            MAP CARD
            =================================================== */}

        <section className="map-card glass">

          <div className="section-header">

            <div>

              <h2>
                <span className="section-icon"> <img src={locationImage} alt="Location" /></span>
                Select a location
              </h2>

              <p>
                Click on a wilaya to select it, or click
                anywhere on the map for a custom location.
              </p>

            </div>

            <div className="wilaya-count">
              58 Wilayas
            </div>

          </div>

          {/* =================================================
              MAP
              ================================================= */}

          <div className="map-wrapper">

            <MapContainer
              center={[36.75, 3.05]}
              zoom={6}

              minZoom={5}
              maxZoom={9}

              scrollWheelZoom={false}
              doubleClickZoom={false}
              dragging={true}
              touchZoom={false}
              boxZoom={false}
              keyboard={true}

              inertia={false}
              zoomDelta={1}
              wheelPxPerZoomLevel={150}

              zoomAnimation={false}
              fadeAnimation={false}
              markerZoomAnimation={false}

              zoomControl={true}

              style={{
                width: "100%",
                height: "100%",
              }}

              className="algeria-map"
            >

              {/* SATELLITE MAP */}

              <TileLayer
                attribution="&copy; Esri"
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              />

              {/* MAP CLICK */}

              <MapClickHandler
                onSelect={handleMapClick}
              />

              {/* WILAYA BOUNDARIES */}

              {geoData && (
                <GeoJSON
                  data={geoData}
                  style={wilayaStyle}
                  onEachFeature={onEachWilaya}
                />
              )}

              {/* SELECTED LOCATION */}

              {selectedWilaya && (
                <CircleMarker
                  center={[
                    selectedWilaya.latitude,
                    selectedWilaya.longitude,
                  ]}
                  radius={7}

                  pathOptions={{
                    color: "#ffffff",
                    weight: 2,
                    fillColor: "#35f1c1",
                    fillOpacity: 1,
                  }}
                />
              )}

            </MapContainer>

            {/* =================================================
                SELECTED LOCATION CARD INSIDE MAP
                ================================================= */}

            {selectedWilaya && (
              <div className="map-location-card">

                <span>
                  {selectedWilaya.isCustom
                    ? "CUSTOM LOCATION"
                    : "SELECTED WILAYA"}
                </span>

                <strong>
                  {selectedWilaya.name}
                </strong>

                <small>
                  {selectedWilaya.latitude.toFixed(4)},{" "}
                  {selectedWilaya.longitude.toFixed(4)}
                </small>

              </div>
            )}

          </div>

          {/* =================================================
              SELECTED LOCATION
              ================================================= */}

          {selectedWilaya && (

            <div className="selected-location">

              <div className="selected-icon">
              <img src={locationImage} alt="Location" />
              </div>

              <div className="selected-info">

                <span>
                  {selectedWilaya.isCustom
                    ? "Selected location"
                    : "Selected Wilaya"}
                </span>

                <strong>
                  {selectedWilaya.name}
                </strong>

              </div>

              <div className="coordinates-display">

                <div>
                  <small>LAT</small>

                  <strong>
                    {selectedWilaya.latitude}
                  </strong>
                </div>

                <div>
                  <small>LON</small>

                  <strong>
                    {selectedWilaya.longitude}
                  </strong>
                </div>

              </div>

            </div>

          )}

        </section>

        {/* ===================================================
            PREDICTION CARD
            =================================================== */}

        <section className="prediction-card glass">

          <div className="prediction-glow"></div>

          <div className="prediction-header">

            <div className="weather-icon">
             <CloudSun size={42} strokeWidth={1.8} />
            </div>

            <div>

              <h2>
                Predict Drought Conditions
              </h2>

              <p>
                Generate an AI drought prediction
              </p>

            </div>

          </div>

          {/* =================================================
              COORDINATES
              ================================================= */}

          <div className="coordinates">

            <div className="input-group">

              <label>
                <span></span>
                Latitude
              </label>

              <div className="input-wrapper">

                <input
                  type="number"
                  step="0.0001"
                  value={latitude}
                  onChange={(e) =>
                    setLatitude(Number(e.target.value))
                  }
                />

                <span className="input-unit">
                  °
                </span>

              </div>

            </div>

            <div className="input-group">

              <label>
                <span></span>
                Longitude
              </label>

              <div className="input-wrapper">

                <input
                  type="number"
                  step="0.0001"
                  value={longitude}
                  onChange={(e) =>
                    setLongitude(Number(e.target.value))
                  }
                />

                <span className="input-unit">
                  °
                </span>

              </div>

            </div>

          </div>

          {/* =================================================
              DATE
              ================================================= */}

          <div className="input-group date-group">

            <label>
              <span></span>
              Target date
            </label>

            <div className="input-wrapper">

              <input
                type="date"
                value={targetDate}
                onChange={(e) =>
                  setTargetDate(e.target.value)
                }
              />

            </div>

          </div>

          {/* =================================================
              BUTTON
              ================================================= */}

          <button
            className="predict-button"
            onClick={predictDrought}
            disabled={loading}
          >

            <span className="button-icon">
              {loading ? "◌" : "✣"}
            </span>

            <span>
              {loading
                ? "Analyzing climate data..."
                : "Predict Drought"}
            </span>

            {!loading && (
              <span className="button-arrow">
                →
              </span>
            )}

          </button>

          {/* =================================================
              ERROR
              ================================================= */}

          {error && (

            <div className="error-box">

              <span>⚠</span>

              {error}

            </div>

          )}

          {/* =================================================
              PREDICTION RESULT
              ================================================= */}

          {prediction && (

            <div
              className={`result ${getSeverityClass(
                prediction.severity
              )}`}
            >

              <div className="result-header">

                <div>

                  <span className="result-small">
                    AI ANALYSIS
                  </span>

                  <h3>
                    Prediction Result
                  </h3>

                </div>

                <div className="result-live">

                  <span></span>

                  LIVE RESULT

                </div>

              </div>

              <div className="result-content">

                {/* SPEI */}

                <div className="spei-section">

                  <div
                    className="spei-ring"
                    style={{
                      "--gauge": `${getGaugePercentage()}%`,
                      "--spei-color": getSpeiColor(
                        prediction.severity
                      ),
                    }}
                  >

                    <div className="spei-ring-inner">

                      <span className="spei-label">
                        SPEI
                      </span>

                      <strong>
                        {Number(
                          prediction.predicted_spei
                        ).toFixed(3)}
                      </strong>

                      <small>
                        predicted index
                      </small>

                    </div>

                  </div>

                </div>

                {/* RESULT DETAILS */}

                <div className="result-details">

                  <div className="info-card drought-info">

                    <div className="info-icon">
                      🌱
                    </div>

                    <div>

                      <span>
                        Drought Level
                      </span>

                      <strong>
                        {prediction.drought_level}
                      </strong>

                    </div>

                  </div>

                  <div className="info-card severity-info">

                    <div className="info-icon">
                      🛡
                    </div>

                    <div>

                      <span>
                        Severity
                      </span>

                      <strong>
                        {prediction.severity}
                      </strong>

                    </div>

                  </div>

                  <div className="recommendation">

                    <div className="recommendation-title">

                      <span> <Sparkles size={28} /></span>

                      Recommendation

                    </div>

                    <p>
                      {prediction.recommendation}
                    </p>

                  </div>

                </div>

              </div>

              {/* INPUT WINDOW */}

              {prediction.input_window && (

                <div className="input-window">

                  <div className="window-icon">
                    <img src={windowImage} alt="Input window" />
                  </div>

                  <div>

                    <span>
                      Input window for prediction
                    </span>

                    <strong>
                      From {prediction.input_window.start}
                      {" → "}
                      {prediction.input_window.end}
                    </strong>

                  </div>

                  <div className="window-months">
                    {prediction.input_window.months} months
                  </div>

                </div>

              )}

            </div>

          )}

        </section>

      </main>

      {/* =====================================================
          FOOTER
          ===================================================== */}

      <footer>

        <span>
          DZ Algeria Drought Prediction
        </span>

        <span className="footer-separator">
          •
        </span>

        <span>
          LSTM + SPEI + ERA5-Land
        </span>

        <span className="footer-status">
          ● System ready
        </span>

      </footer>

    </div>
  );
}

export default App;