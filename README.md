# Water Towers Map V2

This project is a web application that allows users to explore and interact with water tower locations using a map interface. Users can authenticate, view water towers, submit comments, rate their visits, and upload pictures.

## Features

- User authentication (sign up, login)
- Display of water tower locations on a Mapbox map
- Ability to mark water towers as visited
- Submit comments and ratings for each water tower
- Upload pictures of water towers
- Integration with Supabase for database and storage solutions

## Project Structure

- `src/app`: Contains the main application layout and pages.
- `src/components`: Contains reusable components such as the map, authentication forms, and tower markers.
- `src/lib`: Contains utility functions, Supabase client setup, and authentication logic.
- `src/hooks`: Custom hooks for managing authentication and water tower data.
- `src/utils`: Utility functions for geolocation and data import.
- `supabase`: Contains database migrations and seed data for Supabase.
- `scripts`: Scripts for importing data into the database.
- `public`: Static assets such as images.

## Setup Instructions

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd wtmap-v2
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up Supabase:**
   - Create a Supabase project.
   - Configure your database schema using the SQL files in the `supabase/migrations` directory.
   - Update the Supabase client configuration in `src/lib/supabase/client.ts` with your project URL and API key.

4. **Import water tower data:**
   - Place the `wt_raw.json` file in the appropriate directory.
   - Run the import script:
   ```bash
   npm run import-towers
   ```

5. **Run the application:**
   ```bash
   npm run dev
   ```

6. **Open your browser:**
   - Navigate to `http://localhost:3000` to view the application.

## Deployment

This application can be easily deployed on platforms like Vercel. Follow the deployment instructions provided by Vercel to connect your GitHub repository and deploy your application.

## License

This project is licensed under the MIT License. See the LICENSE file for more details.