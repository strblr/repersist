import React, { Component, createContext, useContext } from 'react'
import identity from 'lodash/identity'
import isFunction from 'lodash/isFunction'
import mapValues from 'lodash/mapValues'

export default ({
  init: init_ = () => {},
  actions: actions_ = () => {},
  storage = typeof window !== 'undefined' && window.localStorage,
  storageKey = 'repersist-store',
  serialize = JSON.stringify,
  deserialize = JSON.parse,
  integrity = () => true,
  load = identity
} = {}) => {
  const init = isFunction(init_) ? init_ : () => init_
  const actions = isFunction(actions_) ? actions_ : () => actions_

  const StateContext = createContext()
  const ActionsContext = createContext()

  /* The Provider injects the global state and the actions into the React tree
     via React's context API */

  class Provider extends Component {
    constructor(props) {
      super(props)
      try {
        // First, we try to fetch a state from the storage
        let stored = storage && storage.getItem(storageKey)
        if(!stored)
          throw new Error()
        // If there was one, we try to deserialize it and check its integrity
        stored = deserialize(stored)
        if(!integrity(stored))
          throw new Error()
        // The fetched state can go through a custom loader
        this.state = load(stored)
      }
      catch(_) {
        // If the storage recovery failed, we use the default state
        this.state = init(props)
      }
      // We persist our initial state anyway to ensure consistency
      storage && storage.setItem(storageKey, serialize(this.state))

      // We create an extension of setState which ALSO serializes each new state
      // to the storage
      this.setStateAndSave = state => this.setState(state, () => {
        storage && storage.setItem(storageKey, serialize(this.state))
      })

      // Provided actions go through this special loader in order to call
      // setStateAndSave if they were to return a non-undefined value
      this.actions = mapValues(actions(this.setStateAndSave.bind(this), props),
        action => async (...args) => {
          const newState = await action(...args)
          if(typeof newState !== 'undefined')
            this.setStateAndSave(newState)
        }
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

  return {
    Provider,
    Consumer,
    ActionsConsumer,
    withStore,
    withActions,
    useStore,
    useActions
  }
}
