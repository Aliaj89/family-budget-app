import React from 'react';
import { Navigate } from 'react-router-dom';
import styled from 'styled-components';
import { useAuth } from '../context/AuthContext';
import { FcGoogle } from 'react-icons/fc';
import { FiDollarSign } from 'react-icons/fi';

const Login = () => {
  const { currentUser, loading } = useAuth();

  // If already logged in, redirect to dashboard
  if (currentUser && !loading) {
    return <Navigate to="/dashboard" />;
  }

  return (
    <LoginContainer>
      <LoginCard>
        <LogoContainer>
          <Logo>
            <FiDollarSign />
          </Logo>
          <AppTitle>Family Budget</AppTitle>
        </LogoContainer>
        
        <WelcomeText>
          <h1>Welcome to Family Budget</h1>
          <p>Your complete solution for managing family finances</p>
        </WelcomeText>
        
        <Features>
          <Feature>
            <FeatureTitle>Track Expenses</FeatureTitle>
            <FeatureDescription>
              Easily record and categorize all your family expenses
            </FeatureDescription>
          </Feature>
          
          <Feature>
            <FeatureTitle>Scan Bills</FeatureTitle>
            <FeatureDescription>
              Upload receipts and bills for automatic data extraction
            </FeatureDescription>
          </Feature>
          
          <Feature>
            <FeatureTitle>Budget Analytics</FeatureTitle>
            <FeatureDescription>
              View detailed reports and insights about your spending habits
            </FeatureDescription>
          </Feature>
          
          <Feature>
            <FeatureTitle>Multi-Currency</FeatureTitle>
            <FeatureDescription>
              Support for multiple currencies and automatic conversion
            </FeatureDescription>
          </Feature>
        </Features>
        
        <LoginButtonsContainer>
          <LoginButton href={`${process.env.REACT_APP_API_URL || 'http://localhost:5001/api'}/auth/google`}>
            <FcGoogle />
            <ButtonText>Sign in with Google</ButtonText>
          </LoginButton>
        </LoginButtonsContainer>
        
        <PrivacyInfo>
          By logging in, you agree to our <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>
        </PrivacyInfo>
      </LoginCard>
    </LoginContainer>
  );
};

// Styled components
const LoginContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: ${({ theme }) => theme.colors.background};
  padding: 2rem 1rem;
`;

const LoginCard = styled.div`
  width: 100%;
  max-width: 500px;
  background-color: ${({ theme }) => theme.colors.card};
  border-radius: ${({ theme }) => theme.radii.lg};
  box-shadow: ${({ theme }) => theme.shadows.md};
  padding: 2.5rem 2rem;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    padding: 2rem 1.5rem;
  }
`;

const LogoContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 2rem;
`;

const Logo = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  background-color: ${({ theme }) => theme.colors.primary};
  color: white;
  border-radius: 50%;
  margin-right: 1rem;
  font-size: 1.5rem;
`;

const AppTitle = styled.h1`
  font-size: ${({ theme }) => theme.fontSizes['2xl']};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  color: ${({ theme }) => theme.colors.primary};
`;

const WelcomeText = styled.div`
  text-align: center;
  margin-bottom: 2rem;
  
  h1 {
    font-size: ${({ theme }) => theme.fontSizes.xl};
    margin-bottom: 0.5rem;
  }
  
  p {
    color: ${({ theme }) => theme.colors.textLight};
  }
`;

const Features = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-bottom: 2.5rem;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    grid-template-columns: 1fr;
  }
`;

const Feature = styled.div`
  padding: 1rem;
  background-color: ${({ theme }) => theme.colors.background};
  border-radius: ${({ theme }) => theme.radii.md};
`;

const FeatureTitle = styled.h3`
  font-size: ${({ theme }) => theme.fontSizes.md};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  margin-bottom: 0.5rem;
  color: ${({ theme }) => theme.colors.primary};
`;

const FeatureDescription = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.textLight};
  margin-bottom: 0;
`;

const LoginButtonsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const LoginButton = styled.a`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem 1rem;
  border-radius: ${({ theme }) => theme.radii.md};
  background-color: white;
  border: 1px solid ${({ theme }) => theme.colors.border};
  cursor: pointer;
  transition: ${({ theme }) => theme.transitions.standard};
  text-decoration: none;
  
  &:hover {
    background-color: ${({ theme }) => theme.colors.background};
  }
  
  svg {
    font-size: 1.5rem;
    margin-right: 0.75rem;
  }
`;

const ButtonText = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.md};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.text};
`;

const PrivacyInfo = styled.p`
  text-align: center;
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.textLight};
  margin-bottom: 0;
  
  a {
    color: ${({ theme }) => theme.colors.primary};
    text-decoration: underline;
  }
`;

export default Login;
