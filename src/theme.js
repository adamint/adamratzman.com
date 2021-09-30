import { extendTheme } from "@chakra-ui/react"

export const theme = extendTheme({
  components: {
    Heading: {
      baseStyle: {
        fontFamily: "'Rubik', sans-serif",
        fontWeight: 500
      }
    },
    Text: {
      baseStyle: {
        fontFamily: "'Rubik', sans-serif"
      }
    }
  }
})
