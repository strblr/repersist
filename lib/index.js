function _extends() { _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }

import React, { Component, createContext, useContext } from 'react';
import identity from 'lodash/identity';
import isFunction from 'lodash/isFunction';
import mapValues from 'lodash/mapValues';
export default (({
  init = {},
  actions = {},
  storage = typeof window !== 'undefined' && window.localStorage,
  storageKey = 'repersist-store',
  serialize = JSON.stringify,
  deserialize = JSON.parse,
  integrity = () => true,
  load = identity
} = {}) => {
  let state = null;
  const StateContext = createContext();
  const ActionsContext = createContext();

  try {
    let stored = storage && storage.getItem(storageKey);
    if (!stored) throw new Error();
    stored = deserialize(stored);
    if (!stored || !integrity(stored)) throw new Error();
    stored = load(stored);
    if (!stored) throw new Error();
    state = stored;
  } catch (_) {
    state = init;
  }

  storage && storage.setItem(storageKey, serialize(state));

  class Provider extends Component {
    constructor(props) {
      super(props);
      this.state = state;

      this.saveAndSetState = newState => this.setState(oldState => {
        if (isFunction(newState)) newState = newState(oldState);
        storage && storage.setItem(storageKey, serialize({ ...oldState,
          ...newState
        }));
        return newState;
      });

      this.actions = mapValues(actions, action => async (...args) => this.saveAndSetState((await action(...args))));
    }

    render() {
      return React.createElement(StateContext.Provider, {
        value: this.state
      }, React.createElement(ActionsContext.Provider, {
        value: this.actions
      }, this.props.children));
    }

  }

  const Consumer = ({
    map = identity,
    render,
    children
  }) => React.createElement(StateContext.Consumer, null, state => React.createElement(ActionsContext.Consumer, null, actions => (render || children)(map(state), actions)));

  const ActionsConsumer = ({
    render,
    children
  }) => React.createElement(ActionsContext.Consumer, null, actions => (render || children)(actions));

  const withStore = (map = identity) => Comp => props => React.createElement(Consumer, {
    map: map,
    render: (state, actions) => React.createElement(Comp, _extends({}, props, state, actions))
  });

  const withActions = Comp => props => React.createElement(ActionsConsumer, {
    render: actions => React.createElement(Comp, _extends({}, props, actions))
  });

  const useStore = (map = identity) => {
    const state = useContext(StateContext);
    const actions = useContext(ActionsContext);
    return [map(state), actions];
  };

  const useActions = () => useContext(ActionsContext);

  const readStore = (map = identity) => {
    let stored = storage && storage.getItem(storageKey);
    return stored ? map(deserialize(stored)) : {};
  };

  return {
    Provider,
    Consumer,
    ActionsConsumer,
    withStore,
    withActions,
    useStore,
    useActions,
    readStore
  };
});