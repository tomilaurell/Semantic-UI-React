import React from 'react'
import { act as legacyAct } from 'react-dom/test-utils'

const act = React.act || legacyAct

export default act
export { act }
