import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { FiPlusCircle, FiEdit2, FiTrash2, FiRepeat, FiCalendar, FiDollarSign, FiClock, FiAlertCircle, FiList } from 'react-icons/fi';

const RecurringExpenses = () => {
  const [recurringExpenses, setRecurringExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState(null);
  
  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [editForm, setEditForm] = useState({
    amount: '',
    description: '',
    categoryId: '',
    frequency: 'monthly',
    endDate: '',
    currency: 'USD'
  });
  
  // Fetch data on component mount
  useEffect(() => {
    fetchData();
  }, []);
  
  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch recurring expenses
      const expensesResponse = await axios.get('/recurring-expenses');
      setRecurringExpenses(expensesResponse.data);
      
      // Fetch categories for edit form
      const categoriesResponse = await axios.get('/categories');
      setCategories(categoriesResponse.data);
      
      setLoading(false);
    } catch (err) {
      setError('Failed to load recurring expenses. Please try again.');
      setLoading(false);
    }
  };
  
  // Format currency
  const formatCurrency = (amount, currency = 'USD') => {
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
  
  // Get human-readable frequency
  const getFrequencyLabel = (frequency) => {
    switch (frequency) {
      case 'daily':
        return 'Daily';
      case 'weekly':
        return 'Weekly';
      case 'monthly':
        return 'Monthly';
      case 'yearly':
        return 'Yearly';
      default:
        return frequency;
    }
  };
  
  // Handle delete click
  const handleDeleteClick = (expense) => {
    setExpenseToDelete(expense);
    setShowDeleteModal(true);
  };
  
  // Confirm delete
  const confirmDelete = async () => {
    if (!expenseToDelete) return;
    
    try {
      await axios.delete(`/recurring-expenses/${expenseToDelete._id}`);
      
      // Update local state
      setRecurringExpenses(recurringExpenses.filter(
        expense => expense._id !== expenseToDelete._id
      ));
      
      setSuccess(`Recurring expense "${expenseToDelete.description}" deleted successfully`);
      setExpenseToDelete(null);
      setShowDeleteModal(false);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err) {
      setError('Failed to delete recurring expense. Please try again.');
      setShowDeleteModal(false);
    }
  };
  
  // Cancel delete
  const cancelDelete = () => {
    setExpenseToDelete(null);
    setShowDeleteModal(false);
  };
  
  // Handle edit click
  const handleEditClick = (expense) => {
    setEditingExpense(expense);
    setEditForm({
      amount: expense.amount.toString(),
      description: expense.description,
      categoryId: expense.category?._id || '',
      frequency: expense.frequency,
      endDate: expense.endDate ? new Date(expense.endDate).toISOString().split('T')[0] : '',
      currency: expense.currency || 'USD'
    });
    setShowEditModal(true);
  };
  
  // Handle edit form change
  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditForm({
      ...editForm,
      [name]: value
    });
  };
  
  // Handle edit form submit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    
    if (!editForm.amount || !editForm.description || !editForm.categoryId || !editForm.frequency) {
      setError('Please fill in all required fields');
      return;
    }
    
    try {
      const updatedExpense = {
        amount: parseFloat(editForm.amount),
        description: editForm.description,
        category: editForm.categoryId,
        frequency: editForm.frequency,
        currency: editForm.currency
      };
      
      if (editForm.endDate) {
        updatedExpense.endDate = editForm.endDate;
      }
      
      const response = await axios.put(`/recurring-expenses/${editingExpense._id}`, updatedExpense);
      
      // Update local state
      setRecurringExpenses(recurringExpenses.map(expense => 
        expense._id === editingExpense._id ? response.data : expense
      ));
      
      setSuccess(`Recurring expense "${editForm.description}" updated successfully`);
      setEditingExpense(null);
      setShowEditModal(false);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err) {
      setError('Failed to update recurring expense. Please try again.');
    }
  };
  
  // Cancel edit
  const cancelEdit = () => {
    setEditingExpense(null);
    setShowEditModal(false);
  };
  
  // Group categories by parent
  const groupedCategories = categories.reduce((acc, category) => {
    if (!category.parent) {
      // Main category
      if (!acc[category._id]) {
        acc[category._id] = {
          main: category,
          sub: []
        };
      } else {
        acc[category._id].main = category;
      }
    } else {
      // Subcategory
      if (!acc[category.parent]) {
        acc[category.parent] = {
          main: null,
          sub: [category]
        };
      } else {
        acc[category.parent].sub.push(category);
      }
    }
    
    return acc;
  }, {});
  
  // Sort by next occurrence date
  const sortedExpenses = [...recurringExpenses].sort((a, b) => {
    return new Date(a.nextOccurrence) - new Date(b.nextOccurrence);
  });
  
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
    <RecurringExpensesContainer>
      <PageHeader>
        <h1>Recurring Expenses</h1>
        <Link to="/add-expense">
          <AddButton>
            <FiPlusCircle /> Add New Expense
          </AddButton>
        </Link>
      </PageHeader>
      
      {error && <ErrorMessage>{error}</ErrorMessage>}
      {success && <SuccessMessage>{success}</SuccessMessage>}
      
      {sortedExpenses.length > 0 ? (
        <ExpensesList>
          {sortedExpenses.map(expense => (
            <ExpenseCard key={expense._id}>
              <ExpenseHeader>
                <ExpenseTitle>{expense.description}</ExpenseTitle>
                <ExpenseActions>
                  <ActionButton onClick={() => handleEditClick(expense)}>
                    <FiEdit2 />
                  </ActionButton>
                  <ActionButton onClick={() => handleDeleteClick(expense)}>
                    <FiTrash2 />
                  </ActionButton>
                </ExpenseActions>
              </ExpenseHeader>
              
              <ExpenseDetails>
                <ExpenseDetail>
                  <DetailIcon><FiDollarSign /></DetailIcon>
                  <DetailContent>
                    <DetailLabel>Amount</DetailLabel>
                    <DetailValue>{formatCurrency(expense.amount, expense.currency)}</DetailValue>
                  </DetailContent>
                </ExpenseDetail>
                
                <ExpenseDetail>
                  <DetailIcon><FiRepeat /></DetailIcon>
                  <DetailContent>
                    <DetailLabel>Frequency</DetailLabel>
                    <DetailValue>{getFrequencyLabel(expense.frequency)}</DetailValue>
                  </DetailContent>
                </ExpenseDetail>
                
                <ExpenseDetail>
                  <DetailIcon><FiCalendar /></DetailIcon>
                  <DetailContent>
                    <DetailLabel>Next Occurrence</DetailLabel>
                    <DetailValue>{formatDate(expense.nextOccurrence)}</DetailValue>
                  </DetailContent>
                </ExpenseDetail>
                
                <ExpenseDetail>
                  <DetailIcon><FiList /></DetailIcon>
                  <DetailContent>
                    <DetailLabel>Category</DetailLabel>
                    <DetailValue>{expense.category?.name || 'Uncategorized'}</DetailValue>
                  </DetailContent>
                </ExpenseDetail>
                
                {expense.endDate && (
                  <ExpenseDetail>
                    <DetailIcon><FiClock /></DetailIcon>
                    <DetailContent>
                      <DetailLabel>End Date</DetailLabel>
                      <DetailValue>{formatDate(expense.endDate)}</DetailValue>
                    </DetailContent>
                  </ExpenseDetail>
                )}
              </ExpenseDetails>
              
              {new Date(expense.nextOccurrence) <= new Date() && (
                <UpcomingBadge>
                  <FiAlertCircle /> Due today
                </UpcomingBadge>
              )}
            </ExpenseCard>
          ))}
        </ExpensesList>
      ) : (
        <EmptyState>
          <EmptyIcon><FiRepeat /></EmptyIcon>
          <h3>No Recurring Expenses</h3>
          <p>You haven't set up any recurring expenses yet.</p>
          <Link to="/add-expense">
            <AddButton>
              <FiPlusCircle /> Create Your First Recurring Expense
            </AddButton>
          </Link>
        </EmptyState>
      )}
      
      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <ModalOverlay>
          <Modal>
            <ModalHeader>Confirm Delete</ModalHeader>
            <ModalBody>
              <p>Are you sure you want to delete the recurring expense "{expenseToDelete?.description}"?</p>
              <WarningText>
                This will stop all future occurrences of this expense.
              </WarningText>
            </ModalBody>
            <ModalFooter>
              <CancelButton onClick={cancelDelete}>Cancel</CancelButton>
              <DeleteButton onClick={confirmDelete}>Delete</DeleteButton>
            </ModalFooter>
          </Modal>
        </ModalOverlay>
      )}
      
      {/* Edit Modal */}
      {showEditModal && (
        <ModalOverlay>
          <EditModal>
            <ModalHeader>Edit Recurring Expense</ModalHeader>
            <ModalBody>
              <Form onSubmit={handleEditSubmit}>
                <FormGroup>
                  <Label htmlFor="amount">Amount*</Label>
                  <AmountInputGroup>
                    <CurrencySelect
                      name="currency"
                      value={editForm.currency}
                      onChange={handleEditFormChange}
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                      <option value="CAD">CAD</option>
                      <option value="AUD">AUD</option>
                      <option value="JPY">JPY</option>
                      <option value="CNY">CNY</option>
                      <option value="INR">INR</option>
                      <option value="SAR">SAR</option>
                    </CurrencySelect>
                    <AmountInput
                      id="amount"
                      name="amount"
                      type="number"
                      step="0.01"
                      value={editForm.amount}
                      onChange={handleEditFormChange}
                      required
                    />
                  </AmountInputGroup>
                </FormGroup>
                
                <FormGroup>
                  <Label htmlFor="description">Description*</Label>
                  <Input
                    id="description"
                    name="description"
                    type="text"
                    value={editForm.description}
                    onChange={handleEditFormChange}
                    required
                  />
                </FormGroup>
                
                <FormGroup>
                  <Label htmlFor="categoryId">Category*</Label>
                  <Select
                    id="categoryId"
                    name="categoryId"
                    value={editForm.categoryId}
                    onChange={handleEditFormChange}
                    required
                  >
                    <option value="">Select a category</option>
                    {Object.values(groupedCategories).map(group => (
                      group.main && (
                        <React.Fragment key={group.main._id}>
                          <option value={group.main._id}>{group.main.name}</option>
                          {group.sub.map(sub => (
                            <option key={sub._id} value={sub._id}>
                              &nbsp;&nbsp;— {sub.name}
                            </option>
                          ))}
                        </React.Fragment>
                      )
                    ))}
                  </Select>
                </FormGroup>
                
                <FormGroup>
                  <Label htmlFor="frequency">Frequency*</Label>
                  <Select
                    id="frequency"
                    name="frequency"
                    value={editForm.frequency}
                    onChange={handleEditFormChange}
                    required
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </Select>
                </FormGroup>
                
                <FormGroup>
                  <Label htmlFor="endDate">End Date (Optional)</Label>
                  <Input
                    id="endDate"
                    name="endDate"
                    type="date"
                    value={editForm.endDate}
                    onChange={handleEditFormChange}
                  />
                </FormGroup>
                
                <ButtonGroup>
                  <SubmitButton type="submit">Update Expense</SubmitButton>
                  <CancelButton type="button" onClick={cancelEdit}>Cancel</CancelButton>
                </ButtonGroup>
              </Form>
            </ModalBody>
          </EditModal>
        </ModalOverlay>
      )}
    </RecurringExpensesContainer>
  );
};

// Styled Components
const RecurringExpensesContainer = styled.div`
  padding: 0 1rem;
  max-width: 1200px;
  margin: 0 auto;
`;

const PageHeader = styled.div`
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

const AddButton = styled.button`
  display: flex;
  align-items: center;
  background-color: ${({ theme }) => theme.colors.primary};
  color: white;
  border: none;
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 0.75rem 1.25rem;
  font-size: ${({ theme }) => theme.fontSizes.md};
  cursor: pointer;
  transition: ${({ theme }) => theme.transitions.standard};
  
  svg {
    margin-right: 0.5rem;
  }
  
  &:hover {
    background-color: ${({ theme }) => theme.colors.primaryDark};
  }
`;

const ExpensesList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 1.5rem;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    grid-template-columns: 1fr;
  }
`;

const ExpenseCard = styled.div`
  position: relative;
  background-color: ${({ theme }) => theme.colors.card};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: 1.5rem;
  box-shadow: ${({ theme }) => theme.shadows.sm};
  overflow: hidden;
`;

const ExpenseHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
`;

const ExpenseTitle = styled.h3`
  margin: 0;
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
`;

const ExpenseActions = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  padding: 0.35rem;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.textLight};
  border-radius: ${({ theme }) => theme.radii.sm};
  transition: ${({ theme }) => theme.transitions.standard};
  
  &:hover {
    color: ${({ theme }) => theme.colors.primary};
    background-color: rgba(0, 0, 0, 0.05);
  }
`;

const ExpenseDetails = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.25rem;
`;

const ExpenseDetail = styled.div`
  display: flex;
  align-items: flex-start;
`;

const DetailIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  background-color: ${({ theme }) => theme.colors.background};
  border-radius: ${({ theme }) => theme.radii.md};
  margin-right: 0.75rem;
  color: ${({ theme }) => theme.colors.primary};
`;

const DetailContent = styled.div`
  flex: 1;
`;

const DetailLabel = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.textLight};
  margin-bottom: 0.25rem;
`;

const DetailValue = styled.div`
  font-weight: ${({ theme }) => theme.fontWeights.medium};
`;

const UpcomingBadge = styled.div`
  position: absolute;
  top: 0;
  right: 0;
  background-color: ${({ theme }) => theme.colors.warning};
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 0 ${({ theme }) => theme.radii.lg} 0 ${({ theme }) => theme.radii.lg};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  display: flex;
  align-items: center;
  
  svg {
    margin-right: 0.25rem;
  }
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: ${({ theme }) => theme.colors.card};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: 3rem 2rem;
  text-align: center;
  box-shadow: ${({ theme }) => theme.shadows.sm};
  
  h3 {
    margin: 1rem 0 0.5rem;
  }
  
  p {
    color: ${({ theme }) => theme.colors.textLight};
    margin-bottom: 1.5rem;
  }
`;

const EmptyIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 4rem;
  height: 4rem;
  background-color: ${({ theme }) => theme.colors.background};
  border-radius: 50%;
  font-size: 2rem;
  color: ${({ theme }) => theme.colors.primary};
`;

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const Modal = styled.div`
  background-color: ${({ theme }) => theme.colors.card};
  border-radius: ${({ theme }) => theme.radii.lg};
  width: 100%;
  max-width: 500px;
  box-shadow: ${({ theme }) => theme.shadows.lg};
`;

const EditModal = styled(Modal)`
  max-width: 600px;
`;

const ModalHeader = styled.div`
  padding: 1.5rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  font-size: ${({ theme }) => theme.fontSizes.xl};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
`;

const ModalBody = styled.div`
  padding: 1.5rem;
`;

const ModalFooter = styled.div`
  padding: 1.5rem;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
`;

const FormGroup = styled.div`
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

const Select = styled.select`
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

const AmountInputGroup = styled.div`
  display: flex;
`;

const CurrencySelect = styled.select`
  padding: 0.75rem;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-right: none;
  border-radius: ${({ theme }) => theme.radii.md} 0 0 ${({ theme }) => theme.radii.md};
  font-size: ${({ theme }) => theme.fontSizes.md};
  background-color: ${({ theme }) => theme.colors.background};
  width: 100px;
  
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 1px ${({ theme }) => theme.colors.primary};
  }
`;

const AmountInput = styled.input`
  flex: 1;
  padding: 0.75rem 1rem;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 0 ${({ theme }) => theme.radii.md} ${({ theme }) => theme.radii.md} 0;
  font-size: ${({ theme }) => theme.fontSizes.md};
  
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 1px ${({ theme }) => theme.colors.primary};
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    flex-direction: column;
  }
`;

const SubmitButton = styled.button`
  flex: 1;
  padding: 0.75rem 1.5rem;
  background-color: ${({ theme }) => theme.colors.primary};
  color: white;
  border: none;
  border-radius: ${({ theme }) => theme.radii.md};
  font-size: ${({ theme }) => theme.fontSizes.md};
  cursor: pointer;
  transition: ${({ theme }) => theme.transitions.standard};
  
  &:hover {
    background-color: ${({ theme }) => theme.colors.primaryDark};
  }
`;

const CancelButton = styled.button`
  padding: 0.75rem 1.5rem;
  background-color: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  font-size: ${({ theme }) => theme.fontSizes.md};
  cursor: pointer;
  transition: ${({ theme }) => theme.transitions.standard};
  
  &:hover {
    background-color: ${({ theme }) => theme.colors.border};
  }
`;

const DeleteButton = styled.button`
  padding: 0.75rem 1.5rem;
  background-color: ${({ theme }) => theme.colors.error};
  color: white;
  border: none;
  border-radius: ${({ theme }) => theme.radii.md};
  font-size: ${({ theme }) => theme.fontSizes.md};
  cursor: pointer;
  transition: ${({ theme }) => theme.transitions.standard};
  
  &:hover {
    background-color: #b71c1c;
  }
`;

const WarningText = styled.p`
  color: ${({ theme }) => theme.colors.error};
  margin-top: 1rem;
  font-weight: ${({ theme }) => theme.fontWeights.medium};
`;

const ErrorMessage = styled.div`
  background-color: ${({ theme }) => theme.colors.error};
  color: white;
  padding: 1rem;
  border-radius: ${({ theme }) => theme.radii.md};
  margin-bottom: 1.5rem;
`;

const SuccessMessage = styled.div`
  background-color: ${({ theme }) => theme.colors.success};
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

export default RecurringExpenses;
