import { createGlobalStyle } from 'styled-components';

const GlobalStyle = createGlobalStyle`
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    font-family: 'Roboto', 'Helvetica Neue', sans-serif;
    font-size: 16px;
    line-height: 1.5;
    color: ${({ theme }) => theme.colors.text};
    background-color: ${({ theme }) => theme.colors.background};
  }

  h1, h2, h3, h4, h5, h6 {
    margin-bottom: 0.5rem;
    font-weight: 500;
    line-height: 1.2;
    color: ${({ theme }) => theme.colors.heading};
  }

  p {
    margin-bottom: 1rem;
  }

  a {
    color: ${({ theme }) => theme.colors.primary};
    text-decoration: none;
    
    &:hover {
      color: ${({ theme }) => theme.colors.primaryDark};
    }
  }

  input, select, textarea, button {
    font-family: inherit;
    font-size: inherit;
    line-height: inherit;
  }

  .container {
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 1rem;
  }

  .page-container {
    padding: 2rem 1rem;
  }

  .page-title {
    margin-bottom: 1.5rem;
  }

  /* Responsive adjustments */
  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    body {
      font-size: 14px;
    }

    .page-container {
      padding: 1.5rem 0.75rem;
    }
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    .page-container {
      padding: 1rem 0.5rem;
    }
  }
`;

export default GlobalStyle;
