import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { FiBarChart2, FiCalendar, FiDollarSign, FiPlusCircle, FiShoppingBag, FiTrendingDown, FiTrendingUp } from 'react-icons/fi';

// Import Chart.js
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

const Dashboard = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const [monthlySummary, setMonthlySummary] = useState({});
  const [timeFrame, setTimeFrame] = useState('month'); // 'month', 'quarter', 'year'

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Get current date ranges for queries
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
        
        // Fetch categories
        const categoriesResponse = await axios.get('/categories');
        setCategories(categoriesResponse.data);
        
        // Fetch recent expenses
        const expensesResponse = await axios.get('/expenses', {
          params: {
            limit: 5,
            sort: '-date'
          }
        });
        setExpenses(expensesResponse.data);
        
        // Fetch monthly summary
        const summaryResponse = await axios.get('/expenses/summary', {
          params: {
            startDate: startOfMonth,
            endDate: endOfMonth
          }
        });
        setMonthlySummary(summaryResponse.data);
        setMonthlyTotal(summaryResponse.data.total || 0);
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data. Please try again later.');
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [timeFrame]);

  // Prepare chart data
  const preparePieChartData = () => {
    if (!monthlySummary.byCategory) return { datasets: [] };
    
    const categoryNames = monthlySummary.byCategory.map(item => item.category?.name || 'Uncategorized');
    const categoryAmounts = monthlySummary.byCategory.map(item => item.total);
    
    // Theme colors for consistency
    const chartColors = [
      '#2E7D32', '#1976D2', '#FFA000', '#D32F2F', '#9C27B0', 
      '#00796B', '#E64A19', '#5D4037', '#0288D1', '#388E3C'
    ];
    
    return {
      labels: categoryNames,
      datasets: [
        {
          data: categoryAmounts,
          backgroundColor: chartColors.slice(0, categoryNames.length),
          borderWidth: 1
        }
      ]
    };
  };
  
  const prepareBarChartData = () => {
    if (!monthlySummary.byDay) return { datasets: [] };
    
    let dateLabels = [];
    let amounts = [];
    
    // Create labels based on the time frame
    if (timeFrame === 'month') {
      // For month view, show days of the month
      const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
      dateLabels = Array.from({ length: daysInMonth }, (_, i) => i + 1);
      
      // Initialize amounts with zeros
      amounts = Array(daysInMonth).fill(0);
      
      // Fill in actual amounts
      monthlySummary.byDay?.forEach(item => {
        const day = new Date(item.date).getDate();
        amounts[day - 1] = item.total;
      });
    } else if (timeFrame === 'quarter') {
      // For quarter view, could show weeks or months
      // Simplified for now
      dateLabels = ['Month 1', 'Month 2', 'Month 3'];
      amounts = [
        monthlySummary.total * 0.4, 
        monthlySummary.total * 0.3, 
        monthlySummary.total * 0.3
      ];
    } else {
      // For year view, show months
      dateLabels = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
      ];
      
      // Demo data - in a real app, this would come from the API
      amounts = Array(12).fill(0);
      const currentMonth = new Date().getMonth();
      
      // Just for demo - fill with some sample data
      for (let i = 0; i <= currentMonth; i++) {
        amounts[i] = Math.random() * 2000 + 1000;
      }
      
      // Make current month the real total
      amounts[currentMonth] = monthlySummary.total;
    }
    
    return {
      labels: dateLabels,
      datasets: [
        {
          label: 'Expenses',
          data: amounts,
          backgroundColor: '#4CAF50',
          borderColor: '#2E7D32',
          borderWidth: 1
        }
      ]
    };
  };
  
  // Format currency
  const formatCurrency = (amount, currency = currentUser?.baseCurrency || 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };
  
  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };

  if (loading) {
    return (
      <LoadingWrapper>
        <Loader>
          <div className="spinner"></div>
        </Loader>
      </LoadingWrapper>
    );
  }

  if (error) {
    return (
      <ErrorMessage>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Try Again</button>
      </ErrorMessage>
    );
  }

  return (
    <DashboardContainer>
      <DashboardHeader>
        <h1>Dashboard</h1>
        <TimeFrameSelector>
          <TimeFrameButton 
            active={timeFrame === 'month'} 
            onClick={() => setTimeFrame('month')}
          >
            Month
          </TimeFrameButton>
          <TimeFrameButton 
            active={timeFrame === 'quarter'} 
            onClick={() => setTimeFrame('quarter')}
          >
            Quarter
          </TimeFrameButton>
          <TimeFrameButton 
            active={timeFrame === 'year'} 
            onClick={() => setTimeFrame('year')}
          >
            Year
          </TimeFrameButton>
        </TimeFrameSelector>
      </DashboardHeader>
      
      <SummaryCards>
        <SummaryCard>
          <SummaryCardIcon color="#2E7D32">
            <FiDollarSign />
          </SummaryCardIcon>
          <SummaryCardContent>
            <SummaryCardLabel>Total Expenses</SummaryCardLabel>
            <SummaryCardValue>{formatCurrency(monthlyTotal)}</SummaryCardValue>
            <SummaryCardPeriod>This Month</SummaryCardPeriod>
          </SummaryCardContent>
        </SummaryCard>
        
        <SummaryCard>
          <SummaryCardIcon color="#1976D2">
            <FiTrendingDown />
          </SummaryCardIcon>
          <SummaryCardContent>
            <SummaryCardLabel>Biggest Category</SummaryCardLabel>
            <SummaryCardValue>
              {monthlySummary.byCategory && monthlySummary.byCategory.length > 0
                ? monthlySummary.byCategory[0].category?.name || 'Uncategorized'
                : 'No Data'}
            </SummaryCardValue>
            <SummaryCardPeriod>
              {monthlySummary.byCategory && monthlySummary.byCategory.length > 0
                ? formatCurrency(monthlySummary.byCategory[0].total)
                : '-'}
            </SummaryCardPeriod>
          </SummaryCardContent>
        </SummaryCard>
        
        <SummaryCard>
          <SummaryCardIcon color="#FFA000">
            <FiShoppingBag />
          </SummaryCardIcon>
          <SummaryCardContent>
            <SummaryCardLabel>Total Transactions</SummaryCardLabel>
            <SummaryCardValue>{monthlySummary.count || 0}</SummaryCardValue>
            <SummaryCardPeriod>This Month</SummaryCardPeriod>
          </SummaryCardContent>
        </SummaryCard>
        
        <SummaryCard>
          <SummaryCardIcon color="#D32F2F">
            <FiTrendingUp />
          </SummaryCardIcon>
          <SummaryCardContent>
            <SummaryCardLabel>Avg. per Day</SummaryCardLabel>
            <SummaryCardValue>
              {formatCurrency(monthlySummary.average || 0)}
            </SummaryCardValue>
            <SummaryCardPeriod>This Month</SummaryCardPeriod>
          </SummaryCardContent>
        </SummaryCard>
      </SummaryCards>
      
      <ChartSection>
        <ChartCard>
          <ChartCardHeader>
            <h2>Spending by Category</h2>
          </ChartCardHeader>
          <ChartContainer>
            <Doughnut 
              data={preparePieChartData()} 
              options={{
                plugins: {
                  legend: {
                    position: 'right',
                    labels: {
                      boxWidth: 15,
                      padding: 15
                    }
                  }
                },
                cutout: '70%',
                responsive: true,
                maintainAspectRatio: false
              }}
            />
          </ChartContainer>
        </ChartCard>
        
        <ChartCard>
          <ChartCardHeader>
            <h2>Spending Over Time</h2>
          </ChartCardHeader>
          <ChartContainer>
            <Bar 
              data={prepareBarChartData()} 
              options={{
                plugins: {
                  legend: {
                    display: false
                  }
                },
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  y: {
                    beginAtZero: true
                  }
                }
              }}
            />
          </ChartContainer>
        </ChartCard>
      </ChartSection>
      
      <SectionTitle>
        <h2>Recent Expenses</h2>
        <Link to="/add-expense">
          <AddButton>
            <FiPlusCircle /> Add New
          </AddButton>
        </Link>
      </SectionTitle>
      
      <RecentExpenses>
        {expenses.length > 0 ? (
          expenses.map(expense => (
            <ExpenseCard key={expense._id}>
              <ExpenseCardIcon>
                <FiShoppingBag />
              </ExpenseCardIcon>
              <ExpenseCardDetails>
                <ExpenseCardTitle>{expense.description}</ExpenseCardTitle>
                <ExpenseCardCategory>
                  {expense.category?.name || 'Uncategorized'}
                </ExpenseCardCategory>
                <ExpenseCardDate>
                  <FiCalendar /> {formatDate(expense.date)}
                </ExpenseCardDate>
              </ExpenseCardDetails>
              <ExpenseCardAmount>
                {formatCurrency(expense.amount, expense.currency)}
              </ExpenseCardAmount>
            </ExpenseCard>
          ))
        ) : (
          <NoExpenses>
            <p>You haven't recorded any expenses yet.</p>
            <Link to="/add-expense">
              <AddButton>
                <FiPlusCircle /> Add Your First Expense
              </AddButton>
            </Link>
          </NoExpenses>
        )}
      </RecentExpenses>
      
      <SectionTitle>
        <h2>Budget Status</h2>
        <Link to="/reports">
          <ViewReportsButton>
            <FiBarChart2 /> View Reports
          </ViewReportsButton>
        </Link>
      </SectionTitle>
      
      <BudgetStatusContainer>
        {/* A placeholder for budget progress bars - would be dynamic in a real app */}
        <BudgetCard>
          <BudgetCardHeader>
            <BudgetCardTitle>Housing</BudgetCardTitle>
            <BudgetCardAmount>
              {formatCurrency(800)} / {formatCurrency(1200)}
            </BudgetCardAmount>
          </BudgetCardHeader>
          <BudgetProgressBar>
            <BudgetProgress width={66.7} status="good" />
          </BudgetProgressBar>
        </BudgetCard>
        
        <BudgetCard>
          <BudgetCardHeader>
            <BudgetCardTitle>Food</BudgetCardTitle>
            <BudgetCardAmount>
              {formatCurrency(550)} / {formatCurrency(600)}
            </BudgetCardAmount>
          </BudgetCardHeader>
          <BudgetProgressBar>
            <BudgetProgress width={91.7} status="warning" />
          </BudgetProgressBar>
        </BudgetCard>
        
        <BudgetCard>
          <BudgetCardHeader>
            <BudgetCardTitle>Transportation</BudgetCardTitle>
            <BudgetCardAmount>
              {formatCurrency(450)} / {formatCurrency(400)}
            </BudgetCardAmount>
          </BudgetCardHeader>
          <BudgetProgressBar>
            <BudgetProgress width={112.5} status="danger" />
          </BudgetProgressBar>
        </BudgetCard>
        
        <BudgetCard>
          <BudgetCardHeader>
            <BudgetCardTitle>Entertainment</BudgetCardTitle>
            <BudgetCardAmount>
              {formatCurrency(120)} / {formatCurrency(300)}
            </BudgetCardAmount>
          </BudgetCardHeader>
          <BudgetProgressBar>
            <BudgetProgress width={40} status="good" />
          </BudgetProgressBar>
        </BudgetCard>
      </BudgetStatusContainer>
    </DashboardContainer>
  );
};

// Styled Components
const DashboardContainer = styled.div`
  padding: 0 1rem;
  max-width: 1200px;
  margin: 0 auto;
`;

const DashboardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  
  h1 {
    margin: 0;
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
`;

const TimeFrameSelector = styled.div`
  display: flex;
  border-radius: ${({ theme }) => theme.radii.md};
  overflow: hidden;
  box-shadow: ${({ theme }) => theme.shadows.sm};
`;

const TimeFrameButton = styled.button`
  padding: 0.5rem 1rem;
  border: none;
  background-color: ${({ active, theme }) => active ? theme.colors.primary : theme.colors.card};
  color: ${({ active, theme }) => active ? 'white' : theme.colors.text};
  cursor: pointer;
  transition: ${({ theme }) => theme.transitions.standard};
  
  &:hover {
    background-color: ${({ active, theme }) => active ? theme.colors.primaryDark : theme.colors.background};
  }
`;

const SummaryCards = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.5rem;
  margin-bottom: 2rem;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.lg}) {
    grid-template-columns: repeat(2, 1fr);
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    grid-template-columns: 1fr;
  }
`;

const SummaryCard = styled.div`
  display: flex;
  align-items: center;
  background-color: ${({ theme }) => theme.colors.card};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: 1.5rem;
  box-shadow: ${({ theme }) => theme.shadows.sm};
`;

const SummaryCardIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  background-color: ${({ color }) => color};
  color: white;
  margin-right: 1.25rem;
  font-size: 1.5rem;
`;

const SummaryCardContent = styled.div`
  flex: 1;
`;

const SummaryCardLabel = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.textLight};
  margin-bottom: 0.25rem;
`;

const SummaryCardValue = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.xl};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  margin-bottom: 0.25rem;
`;

const SummaryCardPeriod = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.textLight};
`;

const ChartSection = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;
  margin-bottom: 2rem;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    grid-template-columns: 1fr;
  }
`;

const ChartCard = styled.div`
  background-color: ${({ theme }) => theme.colors.card};
  border-radius: ${({ theme }) => theme.radii.lg};
  box-shadow: ${({ theme }) => theme.shadows.sm};
  padding: 1.5rem;
`;

const ChartCardHeader = styled.div`
  margin-bottom: 1.5rem;
  
  h2 {
    font-size: ${({ theme }) => theme.fontSizes.lg};
    margin: 0;
  }
`;

const ChartContainer = styled.div`
  height: 300px;
`;

const SectionTitle = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  
  h2 {
    font-size: ${({ theme }) => theme.fontSizes.xl};
    margin: 0;
  }
`;

const AddButton = styled.button`
  display: flex;
  align-items: center;
  background-color: ${({ theme }) => theme.colors.primary};
  color: white;
  border: none;
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 0.5rem 1rem;
  cursor: pointer;
  transition: ${({ theme }) => theme.transitions.standard};
  
  &:hover {
    background-color: ${({ theme }) => theme.colors.primaryDark};
  }
  
  svg {
    margin-right: 0.5rem;
  }
`;

const ViewReportsButton = styled(AddButton)`
  background-color: ${({ theme }) => theme.colors.secondary};
  
  &:hover {
    background-color: ${({ theme }) => theme.colors.secondaryDark};
  }
`;

const RecentExpenses = styled.div`
  margin-bottom: 2rem;
`;

const ExpenseCard = styled.div`
  display: flex;
  align-items: center;
  background-color: ${({ theme }) => theme.colors.card};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: 1.25rem;
  margin-bottom: 1rem;
  box-shadow: ${({ theme }) => theme.shadows.sm};
`;

const ExpenseCardIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  background-color: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.textLight};
  margin-right: 1.25rem;
  font-size: 1.25rem;
`;

const ExpenseCardDetails = styled.div`
  flex: 1;
`;

const ExpenseCardTitle = styled.div`
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  margin-bottom: 0.25rem;
`;

const ExpenseCardCategory = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.textLight};
  margin-bottom: 0.25rem;
`;

const ExpenseCardDate = styled.div`
  display: flex;
  align-items: center;
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.textLight};
  
  svg {
    margin-right: 0.25rem;
  }
`;

const ExpenseCardAmount = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
`;

const NoExpenses = styled.div`
  background-color: ${({ theme }) => theme.colors.card};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: 2rem;
  text-align: center;
  box-shadow: ${({ theme }) => theme.shadows.sm};
  
  p {
    margin-bottom: 1rem;
    color: ${({ theme }) => theme.colors.textLight};
  }
`;

const BudgetStatusContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;
  margin-bottom: 2rem;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    grid-template-columns: 1fr;
  }
`;

const BudgetCard = styled.div`
  background-color: ${({ theme }) => theme.colors.card};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: 1.5rem;
  box-shadow: ${({ theme }) => theme.shadows.sm};
`;

const BudgetCardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`;

const BudgetCardTitle = styled.div`
  font-weight: ${({ theme }) => theme.fontWeights.medium};
`;

const BudgetCardAmount = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.textLight};
`;

const BudgetProgressBar = styled.div`
  height: 8px;
  background-color: ${({ theme }) => theme.colors.background};
  border-radius: ${({ theme }) => theme.radii.full};
  overflow: hidden;
`;

const BudgetProgress = styled.div`
  height: 100%;
  width: ${({ width }) => width}%;
  background-color: ${({ status, theme }) => {
    switch (status) {
      case 'danger':
        return theme.colors.error;
      case 'warning':
        return theme.colors.warning;
      default:
        return theme.colors.success;
    }
  }};
  border-radius: ${({ theme }) => theme.radii.full};
`;

const LoadingWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
`;

const Loader = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  
  .spinner {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 3px solid rgba(0, 0, 0, 0.1);
    border-top-color: ${({ theme }) => theme.colors.primary};
    animation: spin 1s ease-in-out infinite;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const ErrorMessage = styled.div`
  background-color: ${({ theme }) => theme.colors.card};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: 2rem;
  text-align: center;
  box-shadow: ${({ theme }) => theme.shadows.sm};
  margin: 2rem;
  
  p {
    color: ${({ theme }) => theme.colors.error};
    margin-bottom: 1rem;
  }
  
  button {
    background-color: ${({ theme }) => theme.colors.primary};
    color: white;
    border: none;
    border-radius: ${({ theme }) => theme.radii.md};
    padding: 0.5rem 1rem;
    cursor: pointer;
    transition: ${({ theme }) => theme.transitions.standard};
    
    &:hover {
      background-color: ${({ theme }) => theme.colors.primaryDark};
    }
  }
`;

export default Dashboard;
