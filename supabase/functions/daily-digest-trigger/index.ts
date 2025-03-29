// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Remove explicit serve import as Deno should be global
// import { serve } from 'jsr:@std/http/server';

// Setup type definitions for built-in Supabase Runtime APIs
// Make sure this is uncommented and correctly referenced
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

console.log('Daily Digest Trigger Function Started');

// Use Deno.serve directly
Deno.serve(async (_req) => {
	// _req is unused, which is fine for this trigger
	// 1. Get Environment Variables
	const siteUrl = 'https://vispositions.com';
	const secretKey = Deno.env.get('DAILY_DIGEST_SECRET_KEY');
	const endpoint = `${siteUrl}/api/newsletter/daily-digest`;

	// 2. Validate Environment Variables
	if (!siteUrl || !secretKey) {
		console.error('Missing required environment variables: SITE_URL or DAILY_DIGEST_SECRET_KEY');
		return new Response(
			JSON.stringify({
				success: false,
				message: 'Internal configuration error: Missing environment variables.'
			}),
			{ status: 500, headers: { 'Content-Type': 'application/json' } }
		);
	}

	console.log(`Attempting to trigger endpoint: ${endpoint}`);

	// 3. Make the POST request to the SvelteKit endpoint
	try {
		const response = await fetch(endpoint, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${secretKey}`,
				'Content-Type': 'application/json' // Even if body is empty, good practice
			}
			// body: JSON.stringify({}) // Optional: send an empty body if needed by the endpoint
		});

		const responseBody = await response.text(); // Read the body for logging
		console.log(`Trigger response status: ${response.status}`);
		console.log(`Trigger response body: ${responseBody}`);

		// 4. Return a response indicating trigger status
		return new Response(
			JSON.stringify({
				triggerSuccess: response.ok,
				endpointStatus: response.status,
				endpointResponse: responseBody
			}),
			{
				status: 200, // The trigger function itself succeeded in making the call
				headers: { 'Content-Type': 'application/json' }
			}
		);
	} catch (error) {
		console.error('Error occurred while trying to trigger the endpoint:', error);
		return new Response(
			JSON.stringify({
				success: false,
				message: `Failed to trigger digest endpoint: ${error.message}`
			}),
			{ status: 500, headers: { 'Content-Type': 'application/json' } }
		);
	}
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/daily-digest-trigger' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
