# hyperscript2jsx-experimental

Transform Hyperscript to JSX like code.
Select the code written in HyperScript and run `Transform Hyperscript to JSX` on command palette, then you get JSX-ish snippet.

## Supported Syntax

- HyperScript

  `h(sel, props, body0, body1, ...)`

- cyclejs

  `div(sel, props, [body0, body1, ...])`

## Features

### Example Input

```ts
h('div.dialog', [
  div('.dialog__content', [
    'Failed to communicate with the server.',
    br(),
    'Please check the network environment and try again.',
    env.debug ? 'This is debug message.' : ''
  ]),
  h('ul', [1, 2, 3].map(i => li(`.dialog__item`, 'note: General function calls will not transformed'))),
  footer(dialog.footer, [
    button(
      `.event-click-retry${btn.base + btn.primary}`,
      {
        disabled: true
      },
      ['Retry']
    )
  ])
]);
```

### Example Output

```jsx
<div className=".dialog">
  <div className=".dialog__content">
    Failed to communicate with the server.
    <br />
    Please check the network environment and try again.
    {env.debug ? 'This is debug message.' : ''}
  </div>
  <ul className="">{[1, 2, 3].map(i => li(`.dialog__item`, 'note: General function calls will not transformed'))}</ul>
  <footer className={dialog.footer}>
    <button className={`.event-click-retry${btn.base + btn.primary}`} disabled={true}>
      Retry
    </button>
  </footer>
</div>
```

## Known Issues

- Syntactic analysis may not work well.

## Release Notes

### 1.0.0

- Initial release

### 1.1.0

- Simplify string literal
  - Changed not to use `{""}` notation as much as possible
