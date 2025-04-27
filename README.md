# Sumplete Game

A modern implementation of the Sumplete number puzzle game with dark/light mode support and a clean, responsive UI.

![Image](https://private-user-images.githubusercontent.com/773341/437974915-8d055c2e-d084-4a4b-81e3-f7df87d9bbff.png?jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3NDU3NzMwODEsIm5iZiI6MTc0NTc3Mjc4MSwicGF0aCI6Ii83NzMzNDEvNDM3OTc0OTE1LThkMDU1YzJlLWQwODQtNGE0Yi04MWUzLWY3ZGY4N2Q5YmJmZi5wbmc_WC1BbXotQWxnb3JpdGhtPUFXUzQtSE1BQy1TSEEyNTYmWC1BbXotQ3JlZGVudGlhbD1BS0lBVkNPRFlMU0E1M1BRSzRaQSUyRjIwMjUwNDI3JTJGdXMtZWFzdC0xJTJGczMlMkZhd3M0X3JlcXVlc3QmWC1BbXotRGF0ZT0yMDI1MDQyN1QxNjUzMDFaJlgtQW16LUV4cGlyZXM9MzAwJlgtQW16LVNpZ25hdHVyZT1hMTI0OTVjMzU5ODUwZjc5NThjNTQwODc5MWQyODk1MTI5NGZmZGUxNWRiZGY2MzAyYjNiNzgzYmM3NjY1MThiJlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCJ9.HpAFtU7MKUrNN9eiWnn3KFnzvVlBKnPsAIIFB_axad0)

## What is Sumplete?

Sumplete is a logic puzzle game where players need to delete numbers so that each row and column adds up to the target number shown at the right and bottom of the grid. The game requires strategic thinking and arithmetic skills.

## Features

- **Clean, Modern UI**: Built with a responsive design that works on all devices
- **Dark/Light Mode**: Automatic theme detection with manual toggle option
- **Multiple Grid Sizes**: Choose from 3x3 (beginner) up to 9x9 (master) puzzles
- **Game Assistance**: Hint system, error detection, and solution reveal options
- **Visual Feedback**: Clear indicators for correct sums and deleted numbers
- **Local Storage**: Game state is saved between sessions
- **Share Functionality**: Easily share the game with friends

## Game Controls

- **Delete/Circle Numbers**: Click on a number to cycle through states (normal → deleted → circled → normal)
- **Errors**: Check for mistakes in your current solution
- **Hint**: Get a suggestion for your next move
- **Restart**: Reset the current puzzle
- **Reveal**: Show the complete solution
- **New Puzzle**: Generate a new puzzle with the selected grid size

## Tech Stack

- **Next.js**: React framework for building the application
- **React**: JavaScript library for building user interfaces
- **TypeScript**: Type-safe JavaScript
- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: High-quality UI components built with Radix UI and Tailwind
- **Lucide Icons**: Beautiful open-source icons
- **next-themes**: Theme management for Next.js

## Getting Started

### Prerequisites

- Node.js 18.x or later
- npm or yarn

### Installation

1. Clone the repository:

```bash
git clone https://github.com/obedmhg/Sumplete.git
cd Sumplete

npm install
# or
yarn install

npm run dev
# or
yarn dev
```
