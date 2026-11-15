# Data

`water_potability.csv` (3,276 rows, 9 features plus `Potability`) is included in this folder.

- **Source:** Kadiwal, A., *Water Potability* [dataset], Kaggle, https://www.kaggle.com/datasets/adityakadiwal/water-potability
- **Licence:** CC0: Public Domain (as listed on the Kaggle page).
- **Provenance:** Kaggle's metadata lists the source as "Synthetically generated".

## Re-downloading

1. Open the Kaggle link above (a Kaggle account is needed).
2. Download `water_potability.csv` and place it at `data/water_potability.csv` (exactly this name and folder).

The notebook checks the file on load: it expects 3,276 rows and 10 columns, and stops with a clear message and the download link if the file is missing or any check fails.

Never put a Kaggle API key (`kaggle.json`) in this repository.
