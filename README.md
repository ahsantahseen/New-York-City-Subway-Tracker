# MTA GTFS Real-Time API

A Node.js Express API that provides real-time NYC subway arrival information using MTA's GTFS feeds.

## Features

- Real-time subway arrival information
- Filter updates by specific subway lines
- Get updates for specific stations
- Base64 encoded responses for efficient data transfer
- Supports all MTA subway lines (A,B,C,D,E,F,G,J,L,M,N,Q,R,W,Z,1,2,3,4,5,6,7,S)

## Prerequisites

- Node.js

## Setup

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Execute

```bash
node api/index.js
```

## API Endpoints

### 1. Get Station List

```
GET /api/stations
```

Returns a list of all subway stations.

### 2. Get Updates by Lines

```
GET /updates/:lines
```

Get real-time updates filtered by subway lines.
Example: `/updates/ACE` for A, C, and E trains

### 3. Get Station Updates

```
POST /station-updates/
```

Get updates for specific stations.

Request body:

```json
{
  "stations": ["14 St-Union Sq", "Times Sq-42 St"]
}
```

## Response Format

All responses containing train updates are Base64 encoded JSON with the following structure:

```json
{
  "routeId": "A",
  "stopName": "14 St-Union Sq",
  "fullStopId": "A01N",
  "stopId": "A01",
  "arrivalTime": "12/25/2023, 3:45:00 PM"
}
```

## Technical Details

- Uses GTFS Realtime protocol buffers for data parsing
- Implements MTA's real-time data feeds
- Handles multiple subway line endpoints simultaneously
- Includes direction-aware stop IDs (North/South bound trains)

## Error Handling

- 500 Internal Server Error: When MTA API is unavailable or returns invalid data
- 500 Failed to load station list: When stations.json cannot be read

## Rate Limiting

Please respect MTA's API rate limits and refer to their [documentation](https://api.mta.info/) for the latest guidelines.

## License

MIT License
