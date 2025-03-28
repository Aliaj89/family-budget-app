import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useAuth } from '../context/AuthContext';

// Icons (you would need to install react-icons with: npm install react-icons)
import { 
  FiHome, 
  FiPlusCircle, 
  FiList, 
  FiBarChart2, 
  FiCalendar, 
  FiMenu, 
  FiX,
  FiLogOut,
  FiUser
} from 'react-icons/fi';

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { currentUser, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const closeMenu = () => {
    setIsOpen(false);
  };

  // If no user, don't render the navigation
  if (!currentUser) {
    return <Outlet />;
  }

  return (
    <StyledNav>
      <Header>
        <Logo>
          <Link to="/">Family Budget</Link>
        </Logo>
        <MenuToggle onClick={toggleMenu}>
          {isOpen ? <FiX /> : <FiMenu />}
        </MenuToggle>
        <DesktopNav>
          <NavLinks>
            <NavItem active={location.pathname === '/dashboard'}>
              <NavLink to="/dashboard" onClick={closeMenu}>
                <FiHome /> Dashboard
              </NavLink>
            </NavItem>
            <NavItem active={location.pathname === '/add-expense'}>
              <NavLink to="/add-expense" onClick={closeMenu}>
                <FiPlusCircle /> Add Expense
              </NavLink>
            </NavItem>
            <NavItem active={location.pathname === '/categories'}>
              <NavLink to="/categories" onClick={closeMenu}>
                <FiList /> Categories
              </NavLink>
            </NavItem>
            <NavItem active={location.pathname === '/reports'}>
              <NavLink to="/reports" onClick={closeMenu}>
                <FiBarChart2 /> Reports
              </NavLink>
            </NavItem>
            <NavItem active={location.pathname === '/recurring-expenses'}>
              <NavLink to="/recurring-expenses" onClick={closeMenu}>
                <FiCalendar /> Recurring
              </NavLink>
            </NavItem>
          </NavLinks>
          <UserControls>
            <UserInfo>
              <UserIcon>
                <FiUser />
              </UserIcon>
              <UserName>{currentUser.name}</UserName>
            </UserInfo>
            <LogoutButton onClick={handleLogout}>
              <FiLogOut /> Logout
            </LogoutButton>
          </UserControls>
        </DesktopNav>
      </Header>

      <MobileNav isOpen={isOpen}>
        <NavLinks>
          <NavItem active={location.pathname === '/dashboard'}>
            <NavLink to="/dashboard" onClick={closeMenu}>
              <FiHome /> Dashboard
            </NavLink>
          </NavItem>
          <NavItem active={location.pathname === '/add-expense'}>
            <NavLink to="/add-expense" onClick={closeMenu}>
              <FiPlusCircle /> Add Expense
            </NavLink>
          </NavItem>
          <NavItem active={location.pathname === '/categories'}>
            <NavLink to="/categories" onClick={closeMenu}>
              <FiList /> Categories
            </NavLink>
          </NavItem>
          <NavItem active={location.pathname === '/reports'}>
            <NavLink to="/reports" onClick={closeMenu}>
              <FiBarChart2 /> Reports
            </NavLink>
          </NavItem>
          <NavItem active={location.pathname === '/recurring-expenses'}>
            <NavLink to="/recurring-expenses" onClick={closeMenu}>
              <FiCalendar /> Recurring
            </NavLink>
          </NavItem>
          <NavItem>
            <LogoutButton onClick={handleLogout}>
              <FiLogOut /> Logout
            </LogoutButton>
          </NavItem>
        </NavLinks>
      </MobileNav>

      <Main>
        <Outlet />
      </Main>
    </StyledNav>
  );
};

// Styled components
const StyledNav = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
`;

const Header = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1.5rem;
  height: 70px;
  background-color: ${({ theme }) => theme.colors.primary};
  color: white;
  box-shadow: ${({ theme }) => theme.shadows.md};
  position: sticky;
  top: 0;
  z-index: 100;
`;

const Logo = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.xl};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  
  a {
    color: white;
    text-decoration: none;
  }
`;

const MenuToggle = styled.button`
  display: none;
  background: none;
  border: none;
  color: white;
  font-size: 1.5rem;
  cursor: pointer;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    display: block;
  }
`;

const DesktopNav = styled.nav`
  display: flex;
  align-items: center;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    display: none;
  }
`;

const MobileNav = styled.nav`
  display: none;
  flex-direction: column;
  background-color: ${({ theme }) => theme.colors.card};
  box-shadow: ${({ theme }) => theme.shadows.md};
  
  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    display: ${({ isOpen }) => (isOpen ? 'flex' : 'none')};
  }
`;

const NavLinks = styled.ul`
  display: flex;
  list-style: none;
  margin: 0;
  padding: 0;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    flex-direction: column;
  }
`;

const NavItem = styled.li`
  margin: 0 0.5rem;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    margin: 0;
    
    &:not(:last-child) {
      border-bottom: 1px solid ${({ theme }) => theme.colors.border};
    }
  }
  
  ${({ active, theme }) =>
    active &&
    `
    background-color: ${theme.colors.primaryDark};
    border-radius: ${theme.radii.md};
    
    @media (max-width: ${theme.breakpoints.md}) {
      background-color: ${theme.colors.primaryLight};
      border-radius: 0;
    }
  `}
`;

const NavLink = styled(Link)`
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  color: white;
  text-decoration: none;
  transition: ${({ theme }) => theme.transitions.standard};
  
  svg {
    margin-right: 0.5rem;
  }
  
  &:hover {
    background-color: ${({ theme }) => theme.colors.primaryDark};
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    color: ${({ theme }) => theme.colors.text};
    
    &:hover {
      background-color: ${({ theme }) => theme.colors.background};
    }
  }
`;

const UserControls = styled.div`
  display: flex;
  align-items: center;
  margin-left: 2rem;
  padding-left: 2rem;
  border-left: 1px solid rgba(255, 255, 255, 0.3);
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  margin-right: 1.5rem;
`;

const UserIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.2);
  margin-right: 0.5rem;
`;

const UserName = styled.span`
  font-weight: ${({ theme }) => theme.fontWeights.medium};
`;

const LogoutButton = styled.button`
  display: flex;
  align-items: center;
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  padding: 0.5rem;
  font-size: ${({ theme }) => theme.fontSizes.md};
  
  svg {
    margin-right: 0.5rem;
  }
  
  &:hover {
    text-decoration: underline;
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    color: ${({ theme }) => theme.colors.text};
    padding: 0.75rem 1rem;
    width: 100%;
    justify-content: flex-start;
    
    &:hover {
      background-color: ${({ theme }) => theme.colors.background};
      text-decoration: none;
    }
  }
`;

const Main = styled.main`
  flex: 1;
  padding: 2rem;
  background-color: ${({ theme }) => theme.colors.background};
  
  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    padding: 1.5rem 1rem;
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    padding: 1rem 0.5rem;
  }
`;

export default Navigation;
