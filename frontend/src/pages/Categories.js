import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { FiEdit, FiTrash2, FiPlus, FiFolder, FiFolderPlus } from 'react-icons/fi';

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Form state for adding/editing
  const [isAddingMain, setIsAddingMain] = useState(false);
  const [isAddingSub, setIsAddingSub] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentCategory, setCurrentCategory] = useState(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');
  const [parentCategoryId, setParentCategoryId] = useState('');
  
  // Modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  
  // Fetch categories on component mount
  useEffect(() => {
    fetchCategories();
  }, []);
  
  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/categories');
      setCategories(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to load categories. Please try again.');
      setLoading(false);
    }
  };
  
  // Reset form state
  const resetForm = () => {
    setCategoryName('');
    setCategoryDescription('');
    setParentCategoryId('');
    setCurrentCategory(null);
    setIsAddingMain(false);
    setIsAddingSub(false);
    setIsEditing(false);
  };
  
  // Handle adding a main category
  const handleAddMainClick = () => {
    resetForm();
    setIsAddingMain(true);
  };
  
  // Handle adding a subcategory
  const handleAddSubClick = () => {
    resetForm();
    setIsAddingSub(true);
  };
  
  // Handle editing a category
  const handleEditClick = (category) => {
    setCurrentCategory(category);
    setCategoryName(category.name);
    setCategoryDescription(category.description || '');
    setParentCategoryId(category.parent || '');
    setIsEditing(true);
  };
  
  // Handle delete click
  const handleDeleteClick = (category) => {
    setCategoryToDelete(category);
    setShowDeleteModal(true);
  };
  
  // Confirm delete
  const confirmDelete = async () => {
    if (!categoryToDelete) return;
    
    try {
      await axios.delete(`/categories/${categoryToDelete._id}`);
      
      // Check if subcategories need to be handled
      const hasSubcategories = categories.some(cat => cat.parent === categoryToDelete._id);
      
      if (hasSubcategories) {
        // Fetch updated categories after deletion
        fetchCategories();
      } else {
        // Just remove from local state
        setCategories(categories.filter(cat => cat._id !== categoryToDelete._id));
      }
      
      setSuccess(`Category "${categoryToDelete.name}" deleted successfully`);
      setCategoryToDelete(null);
      setShowDeleteModal(false);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err) {
      setError('Failed to delete category. Please try again.');
      setShowDeleteModal(false);
    }
  };
  
  // Cancel delete
  const cancelDelete = () => {
    setCategoryToDelete(null);
    setShowDeleteModal(false);
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!categoryName) {
      setError('Category name is required');
      return;
    }
    
    try {
      const categoryData = {
        name: categoryName,
        description: categoryDescription
      };
      
      if (isAddingSub || (isEditing && parentCategoryId)) {
        categoryData.parent = parentCategoryId;
      }
      
      let response;
      
      if (isEditing) {
        // Update existing category
        response = await axios.put(`/categories/${currentCategory._id}`, categoryData);
        
        // Update local state
        setCategories(categories.map(cat => 
          cat._id === currentCategory._id ? response.data : cat
        ));
        
        setSuccess(`Category "${categoryName}" updated successfully`);
      } else {
        // Create new category
        response = await axios.post('/categories', categoryData);
        
        // Add to local state
        setCategories([...categories, response.data]);
        
        setSuccess(`Category "${categoryName}" created successfully`);
      }
      
      // Reset form
      resetForm();
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err) {
      setError('Failed to save category. Please try again.');
    }
  };
  
  // Get main categories (no parent)
  const mainCategories = categories.filter(cat => !cat.parent);
  
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
    <CategoriesContainer>
      <PageHeader>
        <h1>Categories</h1>
        <ButtonGroup>
          <AddButton onClick={handleAddMainClick}>
            <FiFolder /> Add Main Category
          </AddButton>
          <AddButton onClick={handleAddSubClick}>
            <FiFolderPlus /> Add Subcategory
          </AddButton>
        </ButtonGroup>
      </PageHeader>
      
      {error && <ErrorMessage>{error}</ErrorMessage>}
      {success && <SuccessMessage>{success}</SuccessMessage>}
      
      <ContentGrid>
        <CategoriesSection>
          {Object.values(groupedCategories).length > 0 ? (
            <CategoryList>
              {Object.values(groupedCategories).map(group => (
                group.main && (
                  <CategoryItem key={group.main._id}>
                    <MainCategory>
                      <CategoryName>{group.main.name}</CategoryName>
                      <CategoryActions>
                        <ActionButton onClick={() => handleEditClick(group.main)}>
                          <FiEdit />
                        </ActionButton>
                        <ActionButton onClick={() => handleDeleteClick(group.main)}>
                          <FiTrash2 />
                        </ActionButton>
                      </CategoryActions>
                    </MainCategory>
                    
                    {group.sub.length > 0 && (
                      <SubcategoryList>
                        {group.sub.map(sub => (
                          <SubcategoryItem key={sub._id}>
                            <CategoryName>{sub.name}</CategoryName>
                            <CategoryActions>
                              <ActionButton onClick={() => handleEditClick(sub)}>
                                <FiEdit />
                              </ActionButton>
                              <ActionButton onClick={() => handleDeleteClick(sub)}>
                                <FiTrash2 />
                              </ActionButton>
                            </CategoryActions>
                          </SubcategoryItem>
                        ))}
                      </SubcategoryList>
                    )}
                  </CategoryItem>
                )
              ))}
            </CategoryList>
          ) : (
            <EmptyState>
              <p>No categories found. Create your first category to get started.</p>
            </EmptyState>
          )}
        </CategoriesSection>
        
        {(isAddingMain || isAddingSub || isEditing) && (
          <FormSection>
            <SectionTitle>
              {isEditing ? 'Edit Category' : 
                isAddingMain ? 'Add Main Category' : 
                'Add Subcategory'}
            </SectionTitle>
            
            <Form onSubmit={handleSubmit}>
              <FormGroup>
                <Label htmlFor="categoryName">Category Name*</Label>
                <Input
                  id="categoryName"
                  type="text"
                  placeholder="e.g., Groceries"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  required
                />
              </FormGroup>
              
              <FormGroup>
                <Label htmlFor="categoryDescription">Description (Optional)</Label>
                <Textarea
                  id="categoryDescription"
                  placeholder="Enter a description for this category"
                  value={categoryDescription}
                  onChange={(e) => setCategoryDescription(e.target.value)}
                  rows={3}
                />
              </FormGroup>
              
              {(isAddingSub || (isEditing && currentCategory?.parent)) && (
                <FormGroup>
                  <Label htmlFor="parentCategory">Parent Category*</Label>
                  <Select
                    id="parentCategory"
                    value={parentCategoryId}
                    onChange={(e) => setParentCategoryId(e.target.value)}
                    required
                  >
                    <option value="">Select a parent category</option>
                    {mainCategories.map(cat => (
                      <option key={cat._id} value={cat._id}>{cat.name}</option>
                    ))}
                  </Select>
                </FormGroup>
              )}
              
              <ButtonGroup>
                <SubmitButton type="submit">
                  {isEditing ? 'Update Category' : 'Save Category'}
                </SubmitButton>
                <CancelButton type="button" onClick={resetForm}>
                  Cancel
                </CancelButton>
              </ButtonGroup>
            </Form>
          </FormSection>
        )}
      </ContentGrid>
      
      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <ModalOverlay>
          <Modal>
            <ModalHeader>Confirm Delete</ModalHeader>
            <ModalBody>
              <p>Are you sure you want to delete the category "{categoryToDelete?.name}"?</p>
              {categories.some(cat => cat.parent === categoryToDelete?._id) && (
                <WarningText>
                  Warning: This will also delete all subcategories under this category.
                </WarningText>
              )}
            </ModalBody>
            <ModalFooter>
              <CancelButton onClick={cancelDelete}>Cancel</CancelButton>
              <DeleteButton onClick={confirmDelete}>Delete</DeleteButton>
            </ModalFooter>
          </Modal>
        </ModalOverlay>
      )}
    </CategoriesContainer>
  );
};

// Styled Components
const CategoriesContainer = styled.div`
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
  
  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    flex-direction: column;
    width: 100%;
  }
`;

const AddButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
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

const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    grid-template-columns: 1fr;
  }
`;

const CategoriesSection = styled.div`
  background-color: ${({ theme }) => theme.colors.card};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: 2rem;
  box-shadow: ${({ theme }) => theme.shadows.sm};
`;

const FormSection = styled.div`
  background-color: ${({ theme }) => theme.colors.card};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: 2rem;
  box-shadow: ${({ theme }) => theme.shadows.sm};
`;

const SectionTitle = styled.h2`
  font-size: ${({ theme }) => theme.fontSizes.xl};
  margin-bottom: 1.5rem;
`;

const CategoryList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

const CategoryItem = styled.li`
  margin-bottom: 1.5rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  padding-bottom: 0.5rem;
  
  &:last-child {
    margin-bottom: 0;
    border-bottom: none;
    padding-bottom: 0;
  }
`;

const MainCategory = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background-color: ${({ theme }) => theme.colors.background};
  border-radius: ${({ theme }) => theme.radii.md};
  margin-bottom: 0.5rem;
`;

const SubcategoryList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  margin-left: 1.5rem;
`;

const SubcategoryItem = styled.li`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  margin-bottom: 0.5rem;
  border-radius: ${({ theme }) => theme.radii.md};
  
  &:hover {
    background-color: ${({ theme }) => theme.colors.background};
  }
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const CategoryName = styled.span`
  font-weight: ${({ theme }) => theme.fontWeights.medium};
`;

const CategoryActions = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  padding: 0.25rem;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.textLight};
  border-radius: ${({ theme }) => theme.radii.sm};
  transition: ${({ theme }) => theme.transitions.standard};
  
  &:hover {
    color: ${({ theme }) => theme.colors.primary};
    background-color: rgba(0, 0, 0, 0.05);
  }
`;

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

const Textarea = styled.textarea`
  padding: 0.75rem 1rem;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  font-size: ${({ theme }) => theme.fontSizes.md};
  resize: vertical;
  
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

const SubmitButton = styled.button`
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

const WarningText = styled.p`
  color: ${({ theme }) => theme.colors.error};
  margin-top: 1rem;
  font-weight: ${({ theme }) => theme.fontWeights.medium};
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 2rem;
  
  p {
    color: ${({ theme }) => theme.colors.textLight};
    margin-bottom: 1rem;
  }
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

export default Categories;
