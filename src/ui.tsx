import {
  Button,
  Container,
  MiddleAlign,
  Muted,
  Text,
  VerticalSpace,
  render
} from '@create-figma-plugin/ui'
import { h } from 'preact'

function Plugin() {
  function handleButtonClick() {
    console.log('replace with components button clicked')
  }
  return (
    <div
      style={{
        minHeight: '260px',
        padding: '24px',
        background: 'linear-gradient(180deg, #F8FBFF 0%, #EEF4FF 100%)'
      }}
    >
      <MiddleAlign>
        <Container
          space="medium"
          style={{
            width: '260px',
            padding: '24px',
            borderRadius: '16px',
            backgroundColor: '#ffffff',
            boxShadow: '0 12px 32px rgba(15, 23, 42, 0.12)'
          }}
        >
          <Text align="center" style={{ fontWeight: 600 }}>
            Tiny Components
          </Text>
          <Text align="center" style={{ lineHeight: '20px' }}>
            <Muted>
              Refresh your selection with polished components in a single tap.
            </Muted>
          </Text>
          <VerticalSpace space="medium" />
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Button onClick={handleButtonClick}>
              replace with components
            </Button>
          </div>
        </Container>
      </MiddleAlign>
    </div>
  )
}

export default render(Plugin)
