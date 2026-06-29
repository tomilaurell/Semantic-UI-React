import * as React from 'react'
import {
  Button,
  Checkbox,
  Dimmer,
  Dropdown,
  Form,
  Icon,
  Input,
  Modal,
  Popup,
  Portal,
  Search,
  Segment,
  Sidebar,
  Transition,
} from 'semantic-ui-react-19'

const options = [
  { key: 'alpha', text: 'Alpha', value: 'alpha' },
  { key: 'beta', text: 'Beta', value: 'beta' },
]

const results = [
  {
    title: 'Alpha result',
    description: 'React 19 smoke result',
  },
]

export default function App() {
  const inputRef = React.useRef(null)
  const portalContentRef = React.useRef(null)
  const triggerRef = React.useRef(null)

  return (
    <main>
      <Button icon labelPosition='left'>
        <Icon name='check' />
        Button
      </Button>

      <Form>
        <Form.Field control={Input} label='Field input' placeholder='Field input' />
        <Input ref={inputRef} placeholder='Child input'>
          <input ref={inputRef} />
        </Input>
        <Checkbox defaultChecked label='Checkbox' />
      </Form>

      <Dropdown defaultValue='alpha' options={options} selection />
      <Search results={results} value='' />

      <Segment>
        <Dimmer active>
          <span>Dimmer content</span>
        </Dimmer>
        <p>Dimmed segment</p>
      </Segment>

      <Sidebar.Pushable as={Segment}>
        <Sidebar as={Segment} animation='overlay' visible width='thin'>
          Sidebar content
        </Sidebar>
        <Sidebar.Pusher>
          <Segment basic>Sidebar pusher</Segment>
        </Sidebar.Pusher>
      </Sidebar.Pushable>

      <Transition duration={0} visible>
        <div>Transition content</div>
      </Transition>

      <Portal open trigger={<button ref={triggerRef}>Portal trigger</button>}>
        <span ref={portalContentRef}>Portal content</span>
      </Portal>

      <Modal open size='mini'>
        <Modal.Content>Modal content</Modal.Content>
      </Modal>

      <Popup content='Popup content' open trigger={<button>Popup trigger</button>} />
    </main>
  )
}
