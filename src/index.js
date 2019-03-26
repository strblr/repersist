import React, { Component, createContext, useContext } from 'react'
import identity from 'lodash/identity'
import isFunction from 'lodash/isFunction'
import mapValues from 'lodash/mapValues'

export default ({
  /* The default state being used as initial state if nothing's found in the
     storage or if what was found fails the integrity check */
  defaultState: defaultState_ = () => {},

  /* The actions are a set of functions which dictate how an old state can be
     replaced by a newer state */
  actions: actions_ = () => {},

  /* The storage being used to persist the state */
  storage = typeof window !== 'undefined' && window.localStorage,

  /* The storage key being used to persist the state */
  storageKey = 'repersist-store',

  /* The serialization function */
  serialize = JSON.stringify,

  /* The deserialization function */
  deserialize = JSON.parse,

  /* The integrity check function */
  integrity = () => true,

  /* A custom loader to pass through when a persisted state was found */
  load = identity
} = {}) => {
  const defaultState = isFunction(defaultState_) ? defaultState_ : () => defaultState_
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
        this.state = defaultState(props)
      }
      // We persist our initial state anyway to ensure consistency
      storage && storage.setItem(storageKey, serialize(this.state))

      // Provided actions go through this special loader in order to call
      // setState if they were to return a non-undefined value
      this.actions = mapValues(actions(this.setState.bind(this), props),
        action => async (...args) => {
          const newState = await action(...args)
          if(typeof newState !== 'undefined')
            this.setState(newState)
        }
      )
    }

    render() {
      // No magic here, both state & actions are just injected in the tree
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

  const Consumer = ({ map = identity }) => (
    <StateContext.Consumer>
      {state => (
        <ActionsContext.Consumer>
          {actions => this.props.children(map(state), actions)}
        </ActionsContext.Consumer>
      )}
    </StateContext.Consumer>
  )

  /* This is the HOC version of the consumer */

  const withStore = (map = identity) => Comp => props => (
    <Consumer map={map}>
      {(state, actions) => <Comp {...props} {...state} {...actions}/>}
    </Consumer>
  )

  /* This is the hook version of the consumer */

  const useStore = (map = identity) => {
    const state = useContext(StateContext)
    const actions = useContext(ActionsContext)
    return [map(state), actions]
  }

  return {
    Provider,
    Consumer,
    withStore,
    useStore
  }
}
