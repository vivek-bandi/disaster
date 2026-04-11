function parseCoordinate(value, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    return null;
  }

  return parsed;
}

function parseLatitudeLongitude(latitude, longitude) {
  const parsedLatitude = parseCoordinate(latitude, -90, 90);
  if (parsedLatitude === null) {
    return { error: 'Latitude must be a number between -90 and 90.' };
  }

  const parsedLongitude = parseCoordinate(longitude, -180, 180);
  if (parsedLongitude === null) {
    return { error: 'Longitude must be a number between -180 and 180.' };
  }

  return { latitude: parsedLatitude, longitude: parsedLongitude };
}

module.exports = { parseCoordinate, parseLatitudeLongitude };