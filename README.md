# repersist

If you're looking for an **easy**, **fast**, **lightweight** and **idiomatic** way to handle **persistent React states**, this library was made for you. It lets you define and configure as much global stores as you want, and inject and use them *wherever* and *however* you want (render props, higher-order components, hooks) thanks to React's context API.

By default, each state change is automatically persisted in the `localStorage` of the client's browser which allows the library to **persist** and **restore** states across browser sessions, tabs, machine reboots, etc.

## Installation

```
npm install repersist
```

## Guideline

Let's say you're creating a React app with multiple themes and a global search input. You want the associated states to be managed *globally* and to be *persistent*. When you refresh the tab, nothing's lost. If the client's laptop runs out of battery and he has to charge and reboot, nothing's lost either. A whole (arbitrarily complex) working session can be restored just by reopening the tab.

You'll start by defining your store in a **config file** :

```javascript
import repersist from 'repersist'

const { Provider, Consumer } = repersist({
  // define a storage key unique to your app
  storageKey: 'myappkey',
  
  // define a default state
  init: {
    theme: 'light',
    search: ''
  },
  
  // define all the possible actions
  actions: {
    switchTheme: () => ({ theme }) => ({
      theme: theme === 'light' ? 'dark' : 'light'
    }),
    typeSearch: search => ({ search })
  }
})

export { Provider, Consumer }
```

Then, you will inject your store context in the React tree, for example at toplevel :

```jsx
import { Provider } from './storeConfig'

ReactDOM.render(
  <Provider>
    <App/>
  </Provider>,
  document.getElementById('root')
)
```

Well, that's it ! You're good to go :

```jsx
import { Consumer } from './storeConfig'

const SearchField = () => (
  <Consumer>
  {({ search }, { typeSearch }) =>
    <input value={search} onChange={e => typeSearch(e.target.value)}/>
  }
  </Consumer>
)
```

**Or**, using the *hook* version (don't forget to retrieve and export `useStore` from your config file) :

```jsx
import { useStore } from './storeConfig'

const SearchField = () => {
  const [{ search }, { typeSearch }] = useStore()
  return (
    <input value={search} onChange={e => typeSearch(e.target.value)}/>
  )
}
```

**Or**, using the higher-order component (*HOC*) version :

```jsx
import { withStore } from './storeConfig'

const SearchField = withStore()(({ search, typeSearch }) => (
  <input value={search} onChange={e => typeSearch(e.target.value)}/>
))
```

Now when you type something and refresh the page, **nothing is lost**. In the background, each time a new application instance is created, `repersist` hydrates the store which the last serialized version.

## API

### Default import

The default import from the `repersist` package is a function taking a few options, creating a global store and returning context handlers, HOCs and hooks to use that store.

```jsx
import repersist from 'repersist'

const {
  Provider,
  Consumer,
  ActionsConsumer,
  withStore,
  withActions,
  useStore,
  useActions
} = repersist({ ...options })
```

Options are :
- `init`
  - **Type** : `Object <key, any> | (props: Object) => Object <key, any>`
  - **Default value** : `() => ({})`
  - **Role** : The default state to initialize the store when no persisted state was found, or when the integrity check of the persisted state failed. This can be an object of properties like the classic Component's `state` object, *or* an object factory taking the `props` passed to `<Provider>` as argument.
- `actions`
  - **Type** : `Object <key, Function> | (props: Object, setState: Function) => Object <key, Function>`
  - **Default value** : `() => ({})`
  - **Role** : The actions to be performed on the store. This can either be an object containing specific functions (like `toggleMenu`, `changePage`, `swapTheme`, etc.), *or* an object factory taking the `props` passed to `<Provider>` and a state setter function as arguments. The arguments of these action functions are the arguments you pass when you call them. Action functions can do several things :
    - They can be `async`. Example :
    ```javascript
    actions: {
      async fetchData() {
        const data = await fetch('someurl')
        return { data }
      }
    }
    ```
    - They can return an object which will be *merged* into the current state. Example :
    ```javascript
    actions: {
      typeSearch(search) {
        search = search.trim()
        return { search }
      }
    }
    ```
    - They can return a *function* taking the current state as argument and returning an object which will be *merged* into the current state. Example :
    ```javascript
    init: {
      counter: 0
    },
    actions: {
      increment() {
        console.log('Counter incremented')
        return ({ counter }) => ({ counter: counter + 1 })
      }
    }
    ```
    - They can update the state programatically using the state setter function passed as second argument to the actions factory. Example :
    ```javascript
    actions: (props, setState) => {
      setMultiple(value) {
        const multiple = value * props.factor
        setState({ multiple })
      },
      increment() {
        setState(({ counter }) => ({ counter: counter + 1 }))
      },
      decrement() {
        // setState can also take a callback, called when the state is updated
        setState(
          ({ counter }) => ({ counter: counter - 1 }),
          () => console.log('Counter decremented')
        )
      }
    }
    ```

## Upcoming features

- Optionally being able to use *time intervals* to persist states instead of relying on automatic serialization after each change.
- Provide a local solution comparable to `useState` to manage small, local, persistent states.
