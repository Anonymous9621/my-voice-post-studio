# My Voice Post Studio

Build a production-oriented SaaS web app called MyVoice AI.



PRODUCT VISION

MyVoice AI helps creators, online sellers, and small businesses generate marketing content that sounds like their own writing, not generic AI-generated copy.



TARGET MARKET

Start with English-speaking global customers. Design the system to support multiple languages, including Thai, English, and other languages supported by the AI model.



CORE FEATURES



1. Authentication and onboarding



- Sign up, log in, and log out.

- Create a user profile.

- Guide users through setting up their personal writing style.



2. Personal writing style



- Let users paste examples of their own social media posts.

- Analyze tone, vocabulary, sentence length, emoji usage, formatting, and common expressions.

- Generate a reusable writing style profile.

- Save the profile to the database and reuse it for future generations.

- Allow users to edit, rename, and delete style profiles.

- Never claim the AI can perfectly reproduce a writing style.



3. Two writing modes



- My Voice: generate content that follows the user's saved writing style.

- Natural Mode: generate natural, conversational content without generic AI clichés, excessive emojis, repetitive hooks, or robotic phrasing.



4. Content generation form

   Include fields for:



- Product or service

- Product description and key selling points

- Promotion or offer details

- Target audience

- Marketing goal

- Desired tone

- Output language

- Call to action

- Optional product image upload



5. Generation results

   Generate three distinct social media post variations.

   Each result should include:



- Hook

- Main caption

- Call to action

- Suggested visual direction



Allow users to edit, regenerate, copy, save, and delete generated posts.



6. Image understanding

   Allow users to upload product images and use an AI vision API to understand visible product details.

   Do not invent prices, discounts, ingredients, product claims, or promotion conditions.

   Ask for clarification when important details are missing.



7. User dashboard

   Include saved writing styles, recent generations, and usage information.

   Use a clean, modern, responsive interface optimized for desktop and mobile.



8. Technology

   Use the platform's supported stack and integrate Supabase for authentication, PostgreSQL database, and image storage.

   Use a server-side API route or server function for AI requests.

   Keep all API keys in environment variables.

   Never expose secret keys in frontend code.

   Use reusable components and maintainable code.



9. Business model

   Prepare the architecture for Free and Pro subscriptions.

   Do not implement paid billing yet.

   Design the app so usage limits and subscription entitlements can be added later.



10. Design direction

    Use a premium, minimalist SaaS aesthetic.

    Use clear typography, generous spacing, a simple sidebar, and a polished content editor.

    English should be the default interface language.

    Keep the interface easy for nontechnical users.



BUILD INSTRUCTIONS



- Build a functional MVP, not just a static mockup.

- Start with the main UI, authentication, database schema, and saved writing profiles.

- Then implement actual AI content generation using a configurable server-side provider.

- If API credentials are unavailable, clearly label the generation feature as requiring configuration rather than pretending it works.

- Include validation, loading states, error handling, and empty states.

- Explain which environment variables and API keys are required.

- Provide clear instructions for testing and deployment.

- Do not add unnecessary features before the core workflow works.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://my-voice-post-studio.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/2d64c7d6-0abb-53a8-b829-90cbf69e4491).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
