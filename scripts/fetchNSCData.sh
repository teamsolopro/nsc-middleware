#!/bin/bash

# Where to save files
DEST="../cdn/data/"
DATE=$(date +%Y-%m-%d)
# mkdir -p "$DEST/$DATE"

# The four files
URLS=(
  "https://cdn.neighborhoodstage.com/data/productions.json"
  "https://cdn.neighborhoodstage.com/data/venues.json"
  "https://cdn.neighborhoodstage.com/data/companies.json"
  "https://cdn.neighborhoodstage.com/data/auditions.json"
)

for url in "${URLS[@]}"; do
  name=$(basename "$url")
  curl --fail --silent --show-error --location \
       --retry 3 --retry-delay 10 \
       --output "$DEST/$name" "$url" \
    && echo "$(date): saved $name" >> "$DEST/fetch.log" \
    || echo "$(date): FAILED $name" >> "$DEST/fetch.log"
done
