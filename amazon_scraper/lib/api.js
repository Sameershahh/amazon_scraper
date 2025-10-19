const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://amazon-scraper-api.up.railway.app/";

// ------------------------------
// Run Search Mode Scraper
// ------------------------------
export async function runScraper(keyword, pages = 1) {
  const res = await fetch(`${BASE_URL}/run-scraper`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ keyword, pages }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Search scrape failed: ${errorText}`);
  }

  return res.json();
}

// ------------------------------
// Run CSV Mode Scraper
// ------------------------------
export async function runCsvScraper(maxItems = 50, headless = true) {
  const res = await fetch(
    `${BASE_URL}/scrape-csv?max_items=${maxItems}&headless=${headless}`
  );

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`CSV scrape failed: ${errorText}`);
  }

  return res.json();
}

// ------------------------------
// Download prices.csv file
// ------------------------------
export async function downloadCSV() {
  try {
    const res = await fetch(`${BASE_URL}/download_csv`, {
      method: "GET",
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to download CSV: ${errorText}`);
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "database_products.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (error) {
    console.error(" CSV download failed:", error);
    throw error;
  }
}
// ------------------------------
// Delete prices.csv file
// ------------------------------
export async function deleteCSV() {
  const res = await fetch(`${BASE_URL}/delete-csv`, {
    method: "DELETE",
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to delete CSV: ${errorText}`);
  }

  return res.json();
}

// ------------------------------
// Get stored products (optional endpoint)
// ------------------------------
export async function getProducts() {
  const res = await fetch(`${BASE_URL}/products`);
  if (!res.ok) throw new Error("Failed to fetch products");
  return res.json();
}
