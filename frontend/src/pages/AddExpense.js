import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiUpload, FiCamera, FiDollarSign, FiCalendar, FiList, FiFileText, FiRepeat } from 'react-icons/fi';

const AddExpense = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  // Form state
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [currency, setCurrency] = useState(currentUser?.baseCurrency || 'USD');
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState('monthly');
  const [endDate, setEndDate] = useState('');
  const [billImage, setBillImage] = useState(null);
  const [billImagePreview, setBillImagePreview] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState(null);
  
  // Page state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [categories, setCategories] = useState([]);
  const [currencies, setCurrencies] = useState([
    'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR', 'SAR'
  ]);
  const [commonDescriptions, setCommonDescriptions] = useState([
    'Grocery shopping', 
    'Rent payment', 
    'Utilities bill', 
    'Internet bill',
    'Phone bill',
    'Gas/Fuel',
    'Restaurant meal',
    'Coffee',
    'Public transportation',
    'Taxi/Uber',
    'Clothing purchase',
    'Medical expense',
    'Insurance payment',
    'Home repair',
    'Entertainment',
    'Subscription fee',
    'Education expense',
    'Gift purchase',
    'Charity donation'
  ]);
  
  // Fetch categories on component mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axios.get('/categories');
        setCategories(response.data);
        
        // Set default category if available
        if (response.data.length > 0) {
          setCategoryId(response.data[0]._id);
        }
      } catch (err) {
        setError('Failed to load categories. Please try again.');
      }
    };
    
    fetchCategories();
  }, []);
  
  // Handle file selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Check file type
    if (!file.type.match('image.*')) {
      setError('Please upload an image file (JPEG, PNG, etc.)');
      return;
    }
    
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size exceeds 5MB limit');
      return;
    }
    
    setBillImage(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setBillImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
    
    setError('');
  };
  
  // Handle scan bill
  const handleScanBill = async () => {
    if (!billImage) {
      setError('Please upload a bill image first');
      return;
    }
    
    setIsScanning(true);
    setScanResults(null);
    
    try {
      // Create form data for file upload
      const formData = new FormData();
      formData.append('billImage', billImage);
      
      const response = await axios.post('/upload/scan-bill', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setScanResults(response.data);
      
      // Populate form with scan results
      if (response.data.amount) {
        setAmount(response.data.amount);
      }
      
      if (response.data.description) {
        setDescription(response.data.description);
      }
      
      if (response.data.date) {
        setDate(new Date(response.data.date).toISOString().split('T')[0]);
      }
      
      setSuccess('Bill scanned successfully!');
    } catch (err) {
      setError('Failed to scan bill. Please try again or enter details manually.');
    } finally {
      setIsScanning(false);
    }
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!amount || !description || !categoryId || !date) {
      setError('Please fill in all required fields');
      return;
    }
    
    // Validate amount
    if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const expenseData = {
        amount: parseFloat(amount),
        description,
        category: categoryId,
        date,
        currency,
        isRecurring
      };
      
      // Add recurring expense data if applicable
      if (isRecurring) {
        if (!frequency) {
          setError('Please select a frequency for recurring expense');
          setLoading(false);
          return;
        }
        
        expenseData.frequency = frequency;
        
        if (endDate) {
          expenseData.endDate = endDate;
        }
      }
      
      // If bill image is present, upload it
      if (billImage) {
        const formData = new FormData();
        formData.append('billImage', billImage);
        
        const uploadResponse = await axios.post('/upload/bill', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        
        expenseData.billImage = uploadResponse.data.imageUrl;
      }
      
      // Create the expense
      const endpoint = isRecurring ? '/recurring-expenses' : '/expenses';
      await axios.post(endpoint, expenseData);
      
      setSuccess('Expense added successfully!');
      
      // Reset form
      setAmount('');
      setDescription('');
      setCategoryId(categories.length > 0 ? categories[0]._id : '');
      setDate(new Date().toISOString().split('T')[0]);
      setCurrency(currentUser?.baseCurrency || 'USD');
      setIsRecurring(false);
      setFrequency('monthly');
      setEndDate('');
      setBillImage(null);
      setBillImagePreview('');
      setScanResults(null);
      
      // Redirect to dashboard after a delay
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (err) {
      console.error('Error adding expense:', err);
      setError('Failed to add expense. Please try again.');
    } finally {
      setLoading(false);
    }
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
  
  return (
    <AddExpenseContainer>
      <PageTitle>Add Expense</PageTitle>
      
      {error && <ErrorMessage>{error}</ErrorMessage>}
      {success && <SuccessMessage>{success}</SuccessMessage>}
      
      <ContentGrid>
        <FormSection>
          <SectionTitle>Expense Details</SectionTitle>
          
          <Form onSubmit={handleSubmit}>
            <FormGroup>
              <Label htmlFor="amount">
                <FiDollarSign /> Amount*
              </Label>
              <AmountInputGroup>
                <CurrencySelect
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                >
                  {currencies.map(curr => (
                    <option key={curr} value={curr}>{curr}</option>
                  ))}
                </CurrencySelect>
                <AmountInput
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </AmountInputGroup>
            </FormGroup>
            
            <FormGroup>
              <Label htmlFor="description">
                <FiFileText /> Description*
              </Label>
              <DescriptionContainer>
                <Input 
                  id="description" 
                  type="text" 
                  placeholder="e.g., Grocery shopping" 
                  list="common-descriptions"
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  required 
                />
                <datalist id="common-descriptions">
                  {commonDescriptions.map((desc, index) => (
                    <option key={index} value={desc} />
                  ))}
                </datalist>
              </DescriptionContainer>
            </FormGroup>
            
            <FormGroup>
              <Label htmlFor="category">
                <FiList /> Category*
              </Label>
              <Select 
                id="category" 
                value={categoryId} 
                onChange={(e) => setCategoryId(e.target.value)}
                required
              >
                <option value="" disabled>Select a category</option>
                {categories.map(category => (
                  <option key={category._id} value={category._id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </FormGroup>
            
            <FormGroup>
              <Label htmlFor="date">
                <FiCalendar /> Date*
              </Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </FormGroup>
            
            <CheckboxGroup>
              <Checkbox
                id="isRecurring"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
              />
              <CheckboxLabel htmlFor="isRecurring">
                <FiRepeat /> This is a recurring expense
              </CheckboxLabel>
            </CheckboxGroup>
            
            {isRecurring && (
              <RecurringOptions>
                <FormGroup>
                  <Label htmlFor="frequency">Frequency</Label>
                  <Select
                    id="frequency"
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
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
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={date}
                  />
                </FormGroup>
              </RecurringOptions>
            )}
            
            <SubmitButton type="submit" disabled={loading}>
              {loading ? 'Adding...' : 'Add Expense'}
            </SubmitButton>
          </Form>
        </FormSection>
        
        <BillScanSection>
          <SectionTitle>Scan Bill (Optional)</SectionTitle>
          
          <UploadContainer>
            {billImagePreview ? (
              <ImagePreview>
                <img src={billImagePreview} alt="Bill preview" />
                <ChangeImageButton onClick={() => {
                  setBillImage(null);
                  setBillImagePreview('');
                  setScanResults(null);
                }}>
                  Change Image
                </ChangeImageButton>
              </ImagePreview>
            ) : (
              <UploadArea>
                <UploadIcon>
                  <FiUpload />
                </UploadIcon>
                <p>Drag & drop your bill here or click to browse</p>
                <UploadInput
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                />
              </UploadArea>
            )}
          </UploadContainer>
          
          {billImage && (
            <ScanButton onClick={handleScanBill} disabled={isScanning}>
              <FiCamera />
              {isScanning ? 'Scanning...' : 'Scan Bill'}
            </ScanButton>
          )}
          
          {scanResults && (
            <ScanResults>
              <h3>Scan Results</h3>
              <p>
                <strong>Total:</strong> {scanResults.amount ? 
                  `${scanResults.currency || currency} ${scanResults.amount}` : 
                  'Not detected'}
              </p>
              <p>
                <strong>Date:</strong> {scanResults.date ? 
                  new Date(scanResults.date).toLocaleDateString() : 
                  'Not detected'}
              </p>
              <p>
                <strong>Merchant:</strong> {scanResults.merchant || 'Not detected'}
              </p>
              <ScanNoteText>
                Note: You can edit these details in the form if needed.
              </ScanNoteText>
            </ScanResults>
          )}
        </BillScanSection>
      </ContentGrid>
    </AddExpenseContainer>
  );
};

// Styled Components
const AddExpenseContainer = styled.div`
  padding: 0 1rem;
  max-width: 1200px;
  margin: 0 auto;
`;

const PageTitle = styled.h1`
  margin-bottom: 2rem;
`;

const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    grid-template-columns: 1fr;
  }
`;

const SectionTitle = styled.h2`
  font-size: ${({ theme }) => theme.fontSizes.xl};
  margin-bottom: 1.5rem;
`;

const FormSection = styled.div`
  background-color: ${({ theme }) => theme.colors.card};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: 2rem;
  box-shadow: ${({ theme }) => theme.shadows.sm};
`;

const BillScanSection = styled(FormSection)``;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
`;

const Label = styled.label`
  display: flex;
  align-items: center;
  margin-bottom: 0.5rem;
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  
  svg {
    margin-right: 0.5rem;
    color: ${({ theme }) => theme.colors.primary};
  }
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

const DescriptionContainer = styled.div`
  position: relative;
`;

const CheckboxGroup = styled.div`
  display: flex;
  align-items: center;
`;

const Checkbox = styled.input.attrs({ type: 'checkbox' })`
  margin-right: 0.5rem;
  cursor: pointer;
  width: 18px;
  height: 18px;
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  cursor: pointer;
  
  svg {
    margin-right: 0.5rem;
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const RecurringOptions = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  background-color: ${({ theme }) => theme.colors.background};
  padding: 1rem;
  border-radius: ${({ theme }) => theme.radii.md};
  
  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    grid-template-columns: 1fr;
  }
`;

const SubmitButton = styled.button`
  padding: 0.75rem 1.5rem;
  background-color: ${({ theme }) => theme.colors.primary};
  color: white;
  border: none;
  border-radius: ${({ theme }) => theme.radii.md};
  font-size: ${({ theme }) => theme.fontSizes.md};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  cursor: pointer;
  transition: ${({ theme }) => theme.transitions.standard};
  margin-top: 1rem;
  
  &:hover {
    background-color: ${({ theme }) => theme.colors.primaryDark};
  }
  
  &:disabled {
    background-color: ${({ theme }) => theme.colors.disabled};
    cursor: not-allowed;
  }
`;

const UploadContainer = styled.div`
  margin-bottom: 1.5rem;
`;

const UploadArea = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 2px dashed ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 2rem;
  background-color: ${({ theme }) => theme.colors.background};
  text-align: center;
  cursor: pointer;
  position: relative;
  height: 200px;
  
  p {
    color: ${({ theme }) => theme.colors.textLight};
    margin-top: 1rem;
  }
`;

const UploadIcon = styled.div`
  font-size: 3rem;
  color: ${({ theme }) => theme.colors.primary};
`;

const UploadInput = styled.input`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  opacity: 0;
  cursor: pointer;
`;

const ImagePreview = styled.div`
  position: relative;
  
  img {
    width: 100%;
    height: 200px;
    object-fit: contain;
    border-radius: ${({ theme }) => theme.radii.md};
  }
`;

const ChangeImageButton = styled.button`
  position: absolute;
  bottom: 10px;
  right: 10px;
  padding: 0.5rem 1rem;
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  border: none;
  border-radius: ${({ theme }) => theme.radii.md};
  cursor: pointer;
  transition: ${({ theme }) => theme.transitions.standard};
  
  &:hover {
    background-color: rgba(0, 0, 0, 0.9);
  }
`;

const ScanButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem 1.5rem;
  background-color: ${({ theme }) => theme.colors.secondary};
  color: white;
  border: none;
  border-radius: ${({ theme }) => theme.radii.md};
  font-size: ${({ theme }) => theme.fontSizes.md};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  cursor: pointer;
  transition: ${({ theme }) => theme.transitions.standard};
  width: 100%;
  
  &:hover {
    background-color: ${({ theme }) => theme.colors.secondaryDark};
  }
  
  &:disabled {
    background-color: ${({ theme }) => theme.colors.disabled};
    cursor: not-allowed;
  }
  
  svg {
    margin-right: 0.5rem;
  }
`;

const ScanResults = styled.div`
  margin-top: 1.5rem;
  padding: 1.5rem;
  background-color: ${({ theme }) => theme.colors.background};
  border-radius: ${({ theme }) => theme.radii.md};
  
  h3 {
    margin-bottom: 1rem;
    color: ${({ theme }) => theme.colors.primary};
  }
  
  p {
    margin-bottom: 0.5rem;
  }
`;

const ScanNoteText = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.textLight};
  font-style: italic;
  margin-top: 1rem;
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

export default AddExpense;
