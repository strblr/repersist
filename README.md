# repersist

If you're looking for an **easy**, **fast**, **lightweight** and **idiomatic** way to handle **persistent React states**, this library was made for you. It lets you define and configure as much global stores as you want, and inject and use them *wherever* and *however* you want (render props, higher-order components, hooks) thanks to React's context API.

By default, each state change is automatically persisted in the `localStorage` of the client's browser which allows the library to **persist** and **restore** states across browser sessions, tabs, machine reboots, etc.

## Guideline

Let's say you're creating a React app with multiple themes, a global search input and a retractable side menu. You want the associated states to be managed globally and to be persistent, meaning for instance that when you refresh the tab, nothing's lost. If the client's computer runs out of battery and he has to charge and reboot, nothing's lost either.

You'll start by defining 

## API

## Upcoming features

- Optionally being able to use *time intervals* to persist states instead of relying on automatic serialization after each change.
- Provide a local solution comparable to `useState` to manage small, local, persistent states.
