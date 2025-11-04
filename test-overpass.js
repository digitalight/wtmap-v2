// Test script to check Overpass API directly
async function testOverpass() {
  // London bounding box query
  const query = `
    [out:json][timeout:60];
    (
      // Water towers in London area
      node["man_made"="water_tower"](51.2,-0.5,51.7,0.3);
      way["man_made"="water_tower"](51.2,-0.5,51.7,0.3);
      relation["man_made"="water_tower"](51.2,-0.5,51.7,0.3);
      
      // Alternative tags that might be used for water towers in UK
      node["amenity"="water_tower"](51.2,-0.5,51.7,0.3);
      way["amenity"="water_tower"](51.2,-0.5,51.7,0.3);
      
      // Water storage tanks that might be elevated
      node["man_made"="storage_tank"]["content"="water"](51.2,-0.5,51.7,0.3);
      way["man_made"="storage_tank"]["content"="water"](51.2,-0.5,51.7,0.3);
      
      // Reservoirs that might be elevated
      node["man_made"="reservoir_covered"](51.2,-0.5,51.7,0.3);
      way["man_made"="reservoir_covered"](51.2,-0.5,51.7,0.3);
    );
    out center meta;
  `;

  console.log("Testing Overpass query for London area...");
  console.log("Query:", query);

  try {
    const response = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `data=${encodeURIComponent(query)}`,
    });

    if (!response.ok) {
      throw new Error(`Overpass API error: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`Found ${data.elements?.length || 0} elements`);

    if (data.elements && data.elements.length > 0) {
      console.log("Sample elements:");
      data.elements.slice(0, 3).forEach((element, i) => {
        console.log(`Element ${i + 1}:`, {
          id: element.id,
          type: element.type,
          tags: element.tags,
          lat: element.lat || element.center?.lat,
          lon: element.lon || element.center?.lon,
        });
      });
    } else {
      console.log("No elements found. Let's try a broader query...");

      // Try a much broader query to see if there are ANY water-related features
      const broadQuery = `
        [out:json][timeout:60];
        (
          node["man_made"~"water|tank|reservoir"](51.2,-0.5,51.7,0.3);
          way["man_made"~"water|tank|reservoir"](51.2,-0.5,51.7,0.3);
        );
        out center meta;
      `;

      const broadResponse = await fetch(
        "https://overpass-api.de/api/interpreter",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: `data=${encodeURIComponent(broadQuery)}`,
        }
      );

      const broadData = await broadResponse.json();
      console.log(
        `Broad search found ${
          broadData.elements?.length || 0
        } water-related features`
      );

      if (broadData.elements && broadData.elements.length > 0) {
        broadData.elements.slice(0, 5).forEach((element, i) => {
          console.log(`Water feature ${i + 1}:`, {
            id: element.id,
            type: element.type,
            tags: element.tags,
          });
        });
      }
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

testOverpass();
