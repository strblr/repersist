# repersist

If you're looking for an **easy**, **fast**, **lightweight** and **idiomatic** way to handle **persistent React states**, this library was made for you. It lets you define and configure as much global stores as you want, and inject and use them *wherever* and *however* you want (render props, higher-order components, hooks) thanks to React's context API.

By default, each state change is automatically persisted in the `localStorage` of the client's browser which allows the library to **persist** and **restore** states across browser sessions, tabs, machine reboots, etc.

## Installation

```
npm install repersist
```

## Guideline

Let's say you're creating a React app with multiple themes and a global search input. You want the associated states to be managed **globally** and to be **persistent**. When you refresh the tab, nothing's lost. If the client's laptop runs out of battery and he has to charge and reboot, nothing's lost either. A whole (arbitrarily complex) working session can be *restored* just by reopening the tab.

You'll start by defining your store in a **config file** :

```javascript
import repersist from 'repersist'

const { Provider, Consumer } = repersist({
  // define a storage key unique to your store
  storageKey: 'mystorekey',

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

Then, you will inject your store into the React tree's context, for example at toplevel :

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
  useActions,
  readStore
} = repersist({ ...options })
```

#### Options
- `init`
  - **Type** : `Object`
  - **Default value** : `{}`
  - **Role** : The default state to *initialize* the store when no persisted state was found, or when the integrity check of the persisted state failed.
- `actions`
  - **Type** : `Object <key, Function>`
  - **Default value** : `{}`
  - **Role** : The actions to be performed on the store. This must be an object containing specific functions (like `toggleMenu`, `changePage`, `incrementCounter`, `swapTheme`, etc.). The arguments of these action functions are the arguments you pass when you call them, that's up to you. Action functions can do several things :
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
        console.log('Counter will be incremented')
        return ({ counter }) => ({ counter: counter + 1 })
      }
    }
    ```

    - They can be `async`. Example :

    ```javascript
    actions: {
      async fetchData() {
        const data = await fetch('someurl')
        return { data }
      }
    }
    ```

- `storage`
  - **Type** : Anything as long as it has `getItem` and `setItem` properties (see [localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage))
  - **Default value** : `window.localStorage`
  - **Role** : The persistent storage manager. Set it to `null` if you *don't* want persistence at all but just wanna use your store as a regular global state manager (like Redux).
- `storageKey`
  - **Type** : `String`
  - **Default value** : `"repersist-store"`
  - **Role** : The key being used to persist your store into the storage manager. This is *crucial* if you have multiple apps [on a same domain](https://stackoverflow.com/a/4201249/11153160) and/or multiple stores in the same app. Other `repersist` stores using the same key may overwrite the location. Choose a key that is *unique* to your app and *unique* to your store.
- `serialize`
  - **Type** : `Object => String`
  - **Default value** : `JSON.stringify`
  - **Role** : The serialize function. Before any actual persistence, your state is *serialized* into a string. This function does the conversion.
- `deserialize`
  - **Type** : `String => Object`
  - **Default value** : `JSON.parse`
  - **Role** : The deserialize function. When your persisted data is being retrieved, it's just a string. This function parses it back to an actual state object, used as your *initial* state. If this function throws an exception or returns a falsey value, the default `init` state is used as your initial state.
- `integrity`
  - **Type** : `Object => Boolean`
  - **Default value** : `() => true`
  - **Role** : Checks the integrity of your retrieved persisted state. If this function throws an exception or returns a falsey value, the default `init` state is used as your initial state. This is *crucial* because you can never be sure that a persisted state won't be altered outside of your app. Also it can help ensuring *consistency* between different versions of your app and thus potentially different state schemas. You could use tools like [json-schema](https://github.com/kriszyp/json-schema) or [ajv](https://github.com/epoberezkin/ajv) to check persisted states against schema definitions. For example :

  ```javascript
  import jsonSchema from 'jsonschema'

  const options = {
    integrity(state) {
      const validator = new jsonSchema.Validator()
      const schema = {
        type: 'object',
        properties: {
          searchInput: {
            type: 'string',
            required: true
          },
          userToken: {
            type: 'string'
          }
        }
      }
      return validator.validate(state, schema).valid
    }
    // ...
  }
  ```

- `load`
  - **Type** : `Object => Object`
  - **Default value**: `object => object` ([lodash](https://lodash.com/docs/4.17.11#identity)'s `identity` function, actually)
  - **Role** : If you want to apply some changes to your retrieved persisted state before setting it as your initial state, this is the place to do it. If this function throws an exception or returns a falsey value, the default `init` state is used as your initial state.

#### Return value
The `repersist` builder returns a bunch of elements that you will use throughout your app to manipulate your store :

- `Provider`
  - **Type** : React Component
  - **Role** : The React context provider for your store. This will *inject* the store into the React tree, so using it at root-level might be a good idea :

  ```jsx
  ReactDOM.render(
    <Provider>
      <App/>
    </Provider>,
    document.getElementById('root')
  )
  ```

- `Consumer`
  - **Type** : React Component
  - **Props** :
    - `map` : *(Optional)* A map function, mapping your current state into whatever object your want
    - `render` or `children` : `(state: Object, actions: Object) => React tree`
  - **Role** : The React context consumer for your store. Following the [render prop pattern](https://reactjs.org/docs/render-props.html) you can access your state and your actions within your components using the `children` or the `render` prop. This component will rerender on state changes. Example (using the `children` prop) :

  ```jsx
  <Consumer>
  {({ counter }, { increment }) =>
    <div>
      <p>{counter}</p>
      <button onClick={increment}>Increment me</button>
    </div>
  }
  </Consumer>
  ```

- `ActionsConsumer`
  - **Type** : React Component
  - **Props** :
    - `render` or `children` : `(actions: Object) => React tree`
  - **Role** : The React context consumer for your actions only. Useful if you just want to get your action functions and not rerender on state changes. Example :

  ```jsx
  <ActionsConsumer>
  {({ increment }) =>
    <button onClick={increment}>Increment me</button>
  }
  </ActionsConsumer>
  ```

- `withStore`
  - **Type** : React higher-order component
  - **Arguments** :
    - *(Optional)* A map function, mapping your current state into whatever props your want
  - **Role** : Same as `<Consumer>` but using the [higher-order component pattern](https://reactjs.org/docs/higher-order-components.html). Example :

  ```jsx
  const Component = withStore()(({ counter, increment }) => (
    <div>
      <p>{counter}</p>
      <button onClick={increment}>Increment me</button>
    </div>
  ))
  ```

- `withActions`
  - **Type** : React higher-order component
  - **Role** : Same as `<ActionsConsumer>` but using the [higher-order component pattern](https://reactjs.org/docs/higher-order-components.html). Example :

  ```jsx
  const Component = withActions(({ increment }) => (
    <button onClick={increment}>Increment me</button>
  ))
  ```

- `useStore`
  - **Type** : React hook
  - **Arguments** :
    - *(Optional)* A map function, mapping your current state into whatever object you want
  - **Role** : Same as `<Consumer>` but using the [hook pattern](https://reactjs.org/docs/hooks-intro.html). Example :

  ```jsx
  const Component = () => {
    const [{ counter }, { increment }] = useStore()
    return (
      <div>
        <p>{counter}</p>
        <button onClick={increment}>Increment me</button>
      </div>
    )
  }
  ```

- `useActions`
  - **Type** : React hook
  - **Role** : Same as `<ActionsConsumer>` but using the [hook pattern](https://reactjs.org/docs/hooks-intro.html). Example :

  ```jsx
  const Component = () => {
    const { increment } = useActions()
    return <button onClick={increment}>Increment me</button>
  }
  ```
  
- `readStore`
  - **Type** : Function
  - **Arguments** :
    - *(Optional)* A map function, mapping your current persisted state into whatever your want
  - **Role** : Reads and parses back your state directly from the storage. This allows you to get your state (always up-to-date) in a non-reactive way or outside the React tree. Example :

  ```javascript
  const currentUser = readStore(({ currentUser }) => currentUser)
  // Same as :
  const { currentUser } = readStore()
  ```
