import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { Line, Pie, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement
} from 'chart.js';
import { FiCalendar, FiDownload, FiFilter } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const Reports = () => {
  const { currentUser } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filter state
  const [dateRange, setDateRange] = useState('month'); // month, quarter, year, custom
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showCustomDateRange, setShowCustomDateRange] = useState(false);
  
  // Chart data
  const [spendingByCategory, setSpendingByCategory] = useState({
    labels: [],
    datasets: []
  });
  const [spendingOverTime, setSpendingOverTime] = useState({
    labels: [],
    datasets: []
  });
  const [monthlyComparison, setMonthlyComparison] = useState({
    labels: [],
    datasets: []
  });
  
  // Summary stats
  const [totalSpent, setTotalSpent] = useState(0);
  const [avgPerDay, setAvgPerDay] = useState(0);
  const [topCategory, setTopCategory] = useState('');
  const [topCategoryAmount, setTopCategoryAmount] = useState(0);
  
  useEffect(() => {
    fetchData();
  }, []);
  
  useEffect(() => {
    if (expenses.length > 0 && categories.length > 0) {
      processData();
    }
  }, [expenses, categories, dateRange, customStartDate, customEndDate]);
  
  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch expenses
      const expensesResponse = await axios.get('/expenses');
      setExpenses(expensesResponse.data);
      
      // Fetch categories
      const categoriesResponse = await axios.get('/categories');
      setCategories(categoriesResponse.data);
      
      setLoading(false);
    } catch (err) {
      setError('Failed to load report data. Please try again.');
      setLoading(false);
    }
  };
  
  const handleDateRangeChange = (range) => {
    setDateRange(range);
    setShowCustomDateRange(range === 'custom');
    
    // Set default custom date range if not already set
    if (range === 'custom' && !customStartDate) {
      const today = new Date();
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(today.getMonth() - 1);
      
      setCustomStartDate(oneMonthAgo.toISOString().split('T')[0]);
      setCustomEndDate(today.toISOString().split('T')[0]);
    }
  };
  
  const getDateRangeLabel = () => {
    switch (dateRange) {
      case 'month':
        return 'Last 30 Days';
      case 'quarter':
        return 'Last 3 Months';
      case 'year':
        return 'Last 12 Months';
      case 'custom':
        return `${formatDate(customStartDate)} - ${formatDate(customEndDate)}`;
      default:
        return 'Last 30 Days';
    }
  };
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  };
  
  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };
  
  const getFilteredExpenses = () => {
    const now = new Date();
    let startDate;
    
    if (dateRange === 'custom' && customStartDate && customEndDate) {
      startDate = new Date(customStartDate);
      const endDate = new Date(customEndDate);
      endDate.setHours(23, 59, 59, 999); // End of day
      
      return expenses.filter(expense => {
        const expenseDate = new Date(expense.date);
        return expenseDate >= startDate && expenseDate <= endDate;
      });
    } else {
      // Calculate start date based on selected range
      if (dateRange === 'month') {
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 30);
      } else if (dateRange === 'quarter') {
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 3);
      } else if (dateRange === 'year') {
        startDate = new Date(now);
        startDate.setFullYear(now.getFullYear() - 1);
      } else {
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 30); // Default to month
      }
      
      return expenses.filter(expense => new Date(expense.date) >= startDate);
    }
  };
  
  const processData = () => {
    const filteredExpenses = getFilteredExpenses();
    
    // Calculate total spent
    const total = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    setTotalSpent(total);
    
    // Calculate average per day
    const startDate = dateRange === 'custom' ? new Date(customStartDate) : 
                      dateRange === 'month' ? new Date(new Date().setDate(new Date().getDate() - 30)) :
                      dateRange === 'quarter' ? new Date(new Date().setMonth(new Date().getMonth() - 3)) :
                      new Date(new Date().setFullYear(new Date().getFullYear() - 1));
                      
    const days = Math.max(1, Math.round((new Date() - startDate) / (1000 * 60 * 60 * 24)));
    setAvgPerDay(total / days);
    
    // Process category data
    const categoryTotals = {};
    const categoryColors = {};
    
    // Generate consistent colors for categories
    categories.forEach((category, index) => {
      const hue = (index * 137.5) % 360; // Golden angle approximation for better distribution
      categoryColors[category._id] = `hsl(${hue}, 70%, 60%)`;
    });
    
    // Calculate spending by category
    filteredExpenses.forEach(expense => {
      const categoryId = expense.category?._id || 'uncategorized';
      if (!categoryTotals[categoryId]) {
        categoryTotals[categoryId] = 0;
      }
      categoryTotals[categoryId] += expense.amount;
    });
    
    // Find top category
    let maxAmount = 0;
    let maxCategory = '';
    
    Object.entries(categoryTotals).forEach(([categoryId, amount]) => {
      if (amount > maxAmount) {
        maxAmount = amount;
        maxCategory = categoryId;
      }
    });
    
    // Set top category info
    const topCat = categories.find(c => c._id === maxCategory) || { name: 'Uncategorized' };
    setTopCategory(topCat.name);
    setTopCategoryAmount(maxAmount);
    
    // Prepare data for pie chart
    const categoryLabels = [];
    const categoryData = [];
    const categoryBackgroundColors = [];
    
    Object.entries(categoryTotals).forEach(([categoryId, amount]) => {
      const category = categories.find(c => c._id === categoryId) || { name: 'Uncategorized' };
      categoryLabels.push(category.name);
      categoryData.push(amount);
      categoryBackgroundColors.push(categoryColors[categoryId] || 'rgba(128, 128, 128, 0.6)');
    });
    
    setSpendingByCategory({
      labels: categoryLabels,
      datasets: [
        {
          data: categoryData,
          backgroundColor: categoryBackgroundColors,
          borderWidth: 1,
          borderColor: '#ffffff'
        }
      ]
    });
    
    // Process time series data
    const timeData = {};
    const startTimestamp = startDate.getTime();
    const now = new Date();
    
    // Determine time intervals based on date range
    let interval;
    let format;
    
    if (dateRange === 'month' || (dateRange === 'custom' && days <= 40)) {
      interval = 'day';
      format = { month: 'short', day: 'numeric' };
    } else if (dateRange === 'quarter' || (dateRange === 'custom' && days <= 120)) {
      interval = 'week';
      format = { month: 'short', day: 'numeric' };
    } else {
      interval = 'month';
      format = { month: 'short', year: 'numeric' };
    }
    
    // Create time intervals
    const intervals = [];
    const intervalLabels = [];
    
    if (interval === 'day') {
      for (let d = new Date(startDate); d <= now; d.setDate(d.getDate() + 1)) {
        const dateKey = d.toISOString().split('T')[0];
        intervals.push(dateKey);
        intervalLabels.push(new Intl.DateTimeFormat('en-US', format).format(d));
        timeData[dateKey] = 0;
      }
    } else if (interval === 'week') {
      for (let d = new Date(startDate); d <= now; d.setDate(d.getDate() + 7)) {
        const dateKey = d.toISOString().split('T')[0];
        intervals.push(dateKey);
        intervalLabels.push(new Intl.DateTimeFormat('en-US', format).format(d));
        timeData[dateKey] = 0;
      }
    } else {
      for (let d = new Date(startDate); d <= now; d.setMonth(d.getMonth() + 1)) {
        const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        intervals.push(dateKey);
        intervalLabels.push(new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(d));
        timeData[dateKey] = 0;
      }
    }
    
    // Aggregate expenses by time interval
    filteredExpenses.forEach(expense => {
      const expenseDate = new Date(expense.date);
      let dateKey;
      
      if (interval === 'day') {
        dateKey = expenseDate.toISOString().split('T')[0];
      } else if (interval === 'week') {
        // Find the closest week interval
        const closestIndex = intervals.reduce((prevIndex, curr, currIndex, arr) => {
          const prevDiff = Math.abs(new Date(arr[prevIndex]) - expenseDate);
          const currDiff = Math.abs(new Date(curr) - expenseDate);
          return currDiff < prevDiff ? currIndex : prevIndex;
        }, 0);
        dateKey = intervals[closestIndex];
      } else {
        dateKey = `${expenseDate.getFullYear()}-${String(expenseDate.getMonth() + 1).padStart(2, '0')}`;
      }
      
      if (timeData[dateKey] !== undefined) {
        timeData[dateKey] += expense.amount;
      }
    });
    
    // Prepare line chart data
    const timeSeriesData = intervals.map(interval => timeData[interval] || 0);
    
    setSpendingOverTime({
      labels: intervalLabels,
      datasets: [
        {
          label: 'Spending',
          data: timeSeriesData,
          fill: false,
          borderColor: 'rgba(75, 192, 192, 1)',
          tension: 0.4,
          pointBackgroundColor: 'rgba(75, 192, 192, 1)',
          pointRadius: 3,
          pointHoverRadius: 6
        }
      ]
    });
    
    // Prepare monthly comparison data (for the last 6 months)
    const last6Months = [];
    const monthlyData = [];
    const monthlyAvg = [];
    
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    for (let i = 5; i >= 0; i--) {
      const month = (currentMonth - i + 12) % 12;
      const year = currentYear - Math.floor((i - currentMonth) / 12);
      
      const monthName = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(new Date(year, month, 1));
      const monthLabel = `${monthName} ${year}`;
      
      last6Months.push(monthLabel);
      
      const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
      const monthTotal = timeData[monthKey] || 0;
      monthlyData.push(monthTotal);
      
      // Calculate average spending for this month over previous years (if data available)
      let avgCount = 0;
      let avgTotal = 0;
      
      for (let y = year - 1; y >= year - 2; y--) {
        const pastMonthKey = `${y}-${String(month + 1).padStart(2, '0')}`;
        const pastMonthTotal = timeData[pastMonthKey];
        
        if (pastMonthTotal !== undefined) {
          avgTotal += pastMonthTotal;
          avgCount++;
        }
      }
      
      const avgValue = avgCount > 0 ? avgTotal / avgCount : null;
      monthlyAvg.push(avgValue);
    }
    
    setMonthlyComparison({
      labels: last6Months,
      datasets: [
        {
          label: 'This Year',
          data: monthlyData,
          backgroundColor: 'rgba(75, 192, 192, 0.6)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1
        },
        {
          label: 'Average (Previous Years)',
          data: monthlyAvg,
          backgroundColor: 'rgba(153, 102, 255, 0.6)',
          borderColor: 'rgba(153, 102, 255, 1)',
          borderWidth: 1
        }
      ]
    });
  };
  
  const handleExportData = () => {
    const filteredExpenses = getFilteredExpenses();
    
    // Create CSV content
    let csvContent = "Date,Amount,Category,Description\n";
    
    filteredExpenses.forEach(expense => {
      const date = new Date(expense.date).toLocaleDateString();
      const amount = expense.amount;
      const category = expense.category?.name || 'Uncategorized';
      const description = expense.description ? `"${expense.description.replace(/"/g, '""')}"` : '';
      
      csvContent += `${date},${amount},${category},${description}\n`;
    });
    
    // Create download link
    const encodedUri = encodeURI('data:text/csv;charset=utf-8,' + csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `expense_report_${dateRange}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    
    // Download file
    link.click();
    
    // Clean up
    document.body.removeChild(link);
  };
  
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 20,
          usePointStyle: true
        }
      }
    }
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

  return (
    <ReportsContainer>
      <PageHeader>
        <h1>Financial Reports</h1>
        <FilterSection>
          <DateRangeSelector>
            <DateRangeButton 
              active={dateRange === 'month'} 
              onClick={() => handleDateRangeChange('month')}
            >
              Month
            </DateRangeButton>
            <DateRangeButton 
              active={dateRange === 'quarter'} 
              onClick={() => handleDateRangeChange('quarter')}
            >
              Quarter
            </DateRangeButton>
            <DateRangeButton 
              active={dateRange === 'year'} 
              onClick={() => handleDateRangeChange('year')}
            >
              Year
            </DateRangeButton>
            <DateRangeButton 
              active={dateRange === 'custom'} 
              onClick={() => handleDateRangeChange('custom')}
            >
              Custom
            </DateRangeButton>
          </DateRangeSelector>
          
          <ExportButton onClick={handleExportData}>
            <FiDownload /> Export Data
          </ExportButton>
        </FilterSection>
      </PageHeader>
      
      {error && <ErrorMessage>{error}</ErrorMessage>}
      
      {showCustomDateRange && (
        <CustomDateRangeSection>
          <DateField>
            <Label htmlFor="startDate">Start Date</Label>
            <Input 
              id="startDate"
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
            />
          </DateField>
          <DateField>
            <Label htmlFor="endDate">End Date</Label>
            <Input 
              id="endDate"
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              min={customStartDate}
            />
          </DateField>
        </CustomDateRangeSection>
      )}
      
      <DateRangeIndicator>
        <FiCalendar /> {getDateRangeLabel()}
      </DateRangeIndicator>
      
      <SummarySection>
        <SummaryCard>
          <SummaryTitle>Total Spending</SummaryTitle>
          <SummaryAmount>{formatCurrency(totalSpent)}</SummaryAmount>
        </SummaryCard>
        
        <SummaryCard>
          <SummaryTitle>Daily Average</SummaryTitle>
          <SummaryAmount>{formatCurrency(avgPerDay)}</SummaryAmount>
        </SummaryCard>
        
        <SummaryCard>
          <SummaryTitle>Top Category</SummaryTitle>
          <SummaryValue>{topCategory}</SummaryValue>
          <SummaryAmount secondary>{formatCurrency(topCategoryAmount)}</SummaryAmount>
        </SummaryCard>
      </SummarySection>
      
      <ChartGrid>
        <ChartCard>
          <ChartTitle>Spending by Category</ChartTitle>
          <ChartContainer>
            {spendingByCategory.labels.length > 0 ? (
              <Pie data={spendingByCategory} options={chartOptions} />
            ) : (
              <NoDataMessage>No data available for this time period</NoDataMessage>
            )}
          </ChartContainer>
        </ChartCard>
        
        <ChartCard>
          <ChartTitle>Spending Over Time</ChartTitle>
          <ChartContainer>
            {spendingOverTime.labels.length > 0 && spendingOverTime.datasets[0].data.some(value => value > 0) ? (
              <Line data={spendingOverTime} options={chartOptions} />
            ) : (
              <NoDataMessage>No data available for this time period</NoDataMessage>
            )}
          </ChartContainer>
        </ChartCard>
        
        <ChartCard fullWidth>
          <ChartTitle>Monthly Comparison</ChartTitle>
          <ChartContainer>
            {monthlyComparison.labels.length > 0 && monthlyComparison.datasets[0].data.some(value => value > 0) ? (
              <Bar data={monthlyComparison} options={chartOptions} />
            ) : (
              <NoDataMessage>No data available for this time period</NoDataMessage>
            )}
          </ChartContainer>
        </ChartCard>
      </ChartGrid>
    </ReportsContainer>
  );
};

// Styled Components
const ReportsContainer = styled.div`
  padding: 0 1rem;
  max-width: 1200px;
  margin: 0 auto;
`;

const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  
  h1 {
    margin: 0;
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
`;

const FilterSection = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    flex-direction: column;
    align-items: stretch;
    width: 100%;
  }
`;

const DateRangeSelector = styled.div`
  display: flex;
  background-color: ${({ theme }) => theme.colors.background};
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  overflow: hidden;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    width: 100%;
  }
`;

const DateRangeButton = styled.button`
  padding: 0.5rem 1rem;
  background-color: ${({ active, theme }) => active ? theme.colors.primary : 'transparent'};
  color: ${({ active, theme }) => active ? 'white' : theme.colors.text};
  border: none;
  cursor: pointer;
  transition: ${({ theme }) => theme.transitions.standard};
  
  &:hover {
    background-color: ${({ active, theme }) => active ? theme.colors.primaryDark : theme.colors.border};
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    flex: 1;
    padding: 0.5rem 0.5rem;
  }
`;

const ExportButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  background-color: ${({ theme }) => theme.colors.primary};
  color: white;
  border: none;
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 0.6rem 1.25rem;
  cursor: pointer;
  transition: ${({ theme }) => theme.transitions.standard};
  
  &:hover {
    background-color: ${({ theme }) => theme.colors.primaryDark};
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    width: 100%;
  }
`;

const CustomDateRangeSection = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    flex-direction: column;
  }
`;

const DateField = styled.div`
  display: flex;
  flex-direction: column;
`;

const Label = styled.label`
  margin-bottom: 0.5rem;
  font-weight: ${({ theme }) => theme.fontWeights.medium};
`;

const Input = styled.input`
  padding: 0.75rem 1rem;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  font-size: ${({ theme }) => theme.fontSizes.md};
  
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 1px ${({ theme }) => theme.colors.primary};
  }
`;

const DateRangeIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background-color: ${({ theme }) => theme.colors.card};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 0.75rem 1.25rem;
  margin-bottom: 1.5rem;
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  box-shadow: ${({ theme }) => theme.shadows.sm};
`;

const SummarySection = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const SummaryCard = styled.div`
  background-color: ${({ theme }) => theme.colors.card};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: 1.5rem;
  box-shadow: ${({ theme }) => theme.shadows.sm};
`;

const SummaryTitle = styled.div`
  color: ${({ theme }) => theme.colors.textLight};
  margin-bottom: 0.5rem;
`;

const SummaryAmount = styled.div`
  font-size: ${({ theme, secondary }) => secondary ? theme.fontSizes.lg : theme.fontSizes.xl};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  color: ${({ theme, secondary }) => secondary ? theme.colors.primary : theme.colors.text};
`;

const SummaryValue = styled.div`
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  margin-bottom: 0.25rem;
`;

const ChartGrid = styled.div`
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
  padding: 1.5rem;
  box-shadow: ${({ theme }) => theme.shadows.sm};
  grid-column: ${({ fullWidth }) => fullWidth ? 'span 2' : 'span 1'};
  
  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    grid-column: span 1;
  }
`;

const ChartTitle = styled.h3`
  margin-top: 0;
  margin-bottom: 1.5rem;
`;

const ChartContainer = styled.div`
  height: 300px;
  position: relative;
`;

const NoDataMessage = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  color: ${({ theme }) => theme.colors.textLight};
`;

const ErrorMessage = styled.div`
  background-color: ${({ theme }) => theme.colors.error};
  color: white;
  padding: 1rem;
  border-radius: ${({ theme }) => theme.radii.md};
  margin-bottom: 1.5rem;
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

const FiList = styled(FiFilter)``;

export default Reports;
