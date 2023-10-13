import { apiUrl, apiKey } from "./constants.js";

export class GravityApi {

  static async getItem(id) {
    const url = `${apiUrl}/${id}`;
    const headers = new Headers();
    headers.append("x-api-key", apiKey);

    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`Error fetching item: ${response.status}`);
    }

    return JSON .parse((await response.json()).content);
  }

  static async createOrUpdateItem(id, content, password) {
    const url = `${apiUrl}/${id}`;
    const headers = new Headers();
    headers.append("x-api-key", apiKey);
    headers.append("Content-Type", "application/json");
  
    const itemData = {
      id,
      content,
      password,
      "contenttype": "level" //TODO: Set solution for solution
    };
  
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(itemData),
    });
  
    if (!response.ok) {
      throw new Error(`Error creating/updating item: ${response.status}`);
    }
  }
}
