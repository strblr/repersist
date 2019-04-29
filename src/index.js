import React, { Component, createContext, useContext } from 'react'
import identity from 'lodash/identity'
import isFunction from 'lodash/isFunction'
import mapValues from 'lodash/mapValues'
import assign from 'lodash/assign'

export default ({
  init = {},
  actions = {},
  storage = typeof window !== 'undefined' && window.localStorage,
  storageKey = 'repersist-store',
  serialize = JSON.stringify,
  deserialize = JSON.parse,
  integrity = () => true,
  load = identity
} = {}) => {
  let state = null
  const StateContext = createContext()
  const ActionsContext = createContext()

  try {
    // First, we try to fetch a state from the storage
    let stored = storage && storage.getItem(storageKey)
    if(!stored)
      throw new Error()
    // If there was one, we try to deserialize it and check its integrity
    stored = deserialize(stored)
    if(!stored || !integrity(stored))
      throw new Error()
    // The fetched state can go through a custom loader
    stored = load(stored)
    if(!stored)
      throw new Error()
    state = stored
  }
  catch(_) {
    // If the storage recovery failed, we use the default state
    state = init
  }

  // We persist our initial state anyway to ensure consistency
  storage && storage.setItem(storageKey, serialize(state))

  /* The Provider injects the global state and the actions into the React tree
     via React's context API */

  class Provider extends Component {
    constructor(props) {
      super(props)
      this.state = state

      // We create an extension of setState which ALSO serializes each new state
      // to the storage
      this.saveAndSetState = newState => {
        storage && storage.setItem(storageKey, serialize({ ...this.state, ...newState }))
        this.setState(newState)
      }

      // Provided actions go through this special loader in order to call saveAndSetState
      this.actions = mapValues(actions, action =>
        async (...args) => this.saveAndSetState(await action(...args))
      )
    }

    render() {
      return (
        <StateContext.Provider value={this.state}>
          <ActionsContext.Provider value={this.actions}>
            {this.props.children}
          </ActionsContext.Provider>
        </StateContext.Provider>
      )
    }
  }

  /* The Consumer retrieves state & actions from context and passes them to a
     render prop (props.children) */

  const Consumer = ({ map = identity, render, children }) => (
    <StateContext.Consumer>
      {state => (
        <ActionsContext.Consumer>
          {actions => (render || children)(map(state), actions)}
        </ActionsContext.Consumer>
      )}
    </StateContext.Consumer>
  )

  const ActionsConsumer = ({ render, children }) => (
    <ActionsContext.Consumer>
      {actions => (render || children)(actions)}
    </ActionsContext.Consumer>
  )

  /* This is the HOC version of the consumer */

  const withStore = (map = identity) => Comp => props => (
    <Consumer
      map={map}
      render={(state, actions) => (
        <Comp {...props} {...state} {...actions}/>
      )}
    />
  )

  const withActions = Comp => props => (
    <ActionsConsumer render={actions => <Comp {...props} {...actions}/>}/>
  )

  /* This is the hook version of the consumer */

  const useStore = (map = identity) => {
    const state = useContext(StateContext)
    const actions = useContext(ActionsContext)
    return [map(state), actions]
  }

  const useActions = () => useContext(ActionsContext)

  const readPersistedStore = (map = identity) => {
    let stored = storage && storage.getItem(storageKey)
    return stored ? map(deserialize(stored)) : {}
  }

  return {
    Provider,
    Consumer,
    ActionsConsumer,
    withStore,
    withActions,
    useStore,
    useActions,
    readStore
  }
}
