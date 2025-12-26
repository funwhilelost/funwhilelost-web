// Load environment variables from .env file
require('dotenv').config();

// Fetch trailheads from Grist at build time
module.exports = async function() {
  // Check for API key
  if (!process.env.GRIST_API_KEY) {
    console.warn("GRIST_API_KEY not found, returning empty trailheads data");
    return { records: [] };
  }

  try {
    const response = await fetch(
      "https://docs.getgrist.com/api/docs/ctScWaoTj7UAKGxm1mVpuK/tables/Tours/records",
      { 
        method: 'GET', 
        redirect: 'follow', 
        headers: { 
          "Authorization": `Bearer ${process.env.GRIST_API_KEY}` 
        } 
      }
    );

    if (!response.ok) {
      console.error(`Grist API error: ${response.status} ${response.statusText}`);
      return { records: [] };
    }

    const data = await response.json();
    
    // Map Grist records into a basic "trailhead" object
    const trailheads = data.records.map(r => ({ 
      id: r.id,
      lat: r.fields.Lat,
      lon: r.fields.Lon,
      name: r.fields.Name,
    }));

    return { trailheads };
  } catch (error) {
    console.error("Error fetching trailheads from Grist:", error);
    return { records: [] };
  }
};
