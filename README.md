# Campus Event Hub 🎓

Campus Event Hub is a premium, inter-college event management platform designed to streamline event discovery, registration, and student engagement. 

This repository has been recently upgraded with the **"Milestone 2: Premium Features"** update, focusing on high-fidelity UI/UX and gamification.

## 🚀 Key Features

### 🌙 System-Wide Dark Mode
- Experience the platform in a sleek, high-contrast dark theme.
- Persistent theme preference saved via `localStorage`.
- Smooth transitions and theme-aware UI components.

### 🏆 Student Leaderboard & Gamification
- **Competitive Ranking**: View top students across colleges based on participation points (XP).
- **Personal Stats**: Track your rank, XP, and earned badges directly on your dashboard.
- **Achievement Badges**: Earn special badges for "Innovation," "Leadership," and more.

### 🧭 Chatbot Nav-Assist
- An AI-powered (Natural Language) navigation assistant.
- Tell the bot where you want to go (e.g., *"Show me events"* or *"Go to my profile"*), and the dashboard navigates automatically.

### 🔥 Trending Events & Live Ticker
- **Trending Carousel**: Real-time discovery of high-demand events.
- **Urgency Tags**: See live capacity (e.g., *"85% Full"*) to never miss a spot.
- **Activity Ticker**: A live feed of global community registrations and achievements.

### 🎨 Premium UI Redesign
- **Minimalist Event Cards**: Image-focused, modern card designs.
- **Tabbed Modal View**: Seamless registration flow without page reloads.
- **Buttery-Smooth Animations**: Horizontal slide-and-fade effects for all view transitions.

## 🛠 Tech Stack
- **Frontend**: Angular 17+ (Signals, Animations, Standalone Components)
- **Backend**: Node.js & Express
- **Database**: MongoDB (Atlas)
- **Styling**: Modern Vanilla CSS with semantic variables

## 🏃 How to Run

### Prerequisites
- Node.js (v18+)
- Angular CLI (`npm install -g @angular/cli`)

### 1. Backend Setup
```bash
cd backend
npm install
node server.js
```
*Server runs on `http://localhost:5000`*
### 2.MongoDB connection :
MONGODB_URI=mongodb+srv://shalinivanjinathan_db_user:Shalini@123@cluster0.iwimuje.mongodb.net/campus-event-hub?retryWrites=true&w=majority


### 3. Frontend Setup
```bash
cd frontend
npm install
npm start
```
*Application opens at `http://localhost:4200`*



## 🔐 Internal Team Notes (For Contributors Only)

### Premium Logic Mechanics
- **Signals**: We are using Angular Signals for `currentView`, `isDarkMode`, and `currentUser`. Always use `.update()` or `.set()` to ensure the UI reacts instantly.
- **Nav-Assist**: The logic lives in `chat.service.ts` and is detected in `student-dashboard.component.ts` via an `effect`. If adding new pages, remember to update the `viewMap` in the dashboard.
- **Animations**: The `@viewAnimation` trigger is defined in the dashboard component. It uses `group` to animate both the entering and leaving views simultaneously.

### Next Development Priorities
1. **API Migration**: Move the `leaderboardData` and `activities` signals from mock arrays to real `HttpClient` calls fetching from the port 5000 backend.
2. **Badge Persistence**: Currently, badges added during the session are not saved to the DB. Need to implement a `PUT /api/users/badges` endpoint.
3. **Payment Security**: When moving to Milestone 3, the `walletBalance` deduction logic must move to the backend to prevent client-side manipulation.


