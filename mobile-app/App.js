import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  StatusBar,
  RefreshControl,
  BackHandler,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';

const API_BASE_URL = '';
// Removed the original for security purposes

const ExpenseTracker = () => {
  const [currentUser, setCurrentUser] = useState('Meyan');
  const [transactions, setTransactions] = useState([]);
  const [pendingTransactions, setPendingTransactions] = useState([]);
  const [balances, setBalances] = useState({ meyan: 0, kushal: 0 });
  const [isConnected, setIsConnected] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showDebtModal, setShowDebtModal] = useState(false);
  const [debtAmount, setDebtAmount] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    particular: '',
    total: '',
    meyanPay: '',
    kushalPay: '',
    remarks: ''
  });

  const loadUserPreference = async () => {
    try {
      const savedUser = await AsyncStorage.getItem('selectedUser');
      if (savedUser) {
        setCurrentUser(savedUser);
      }
    } catch (error) {
      console.error('Error loading user preference:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveUserPreference = async (user) => {
    try {
      await AsyncStorage.setItem('selectedUser', user);
    } catch (error) {
      console.error('Error saving user preference:', error);
    }
  };

  // Handle user selection
  const handleUserSelection = (user) => {
    setCurrentUser(user);
    saveUserPreference(user);
    setShowUserModal(false);
  };

  // API functions
  const apiCall = async (endpoint, method = 'GET', data = null) => {
    try {
      const url = `${API_BASE_URL}${endpoint}`;
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser}`,
        },
        body: data ? JSON.stringify(data) : null,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      setIsConnected(true);
      return result;
    } catch (error) {
      console.error('API Error:', error);
      setIsConnected(false);
      Alert.alert('Connection Error', 'Failed to connect to server. Please check your internet connection.');
      return null;
    }
  };

  const fetchTransactions = async () => {
    const data = await apiCall('/transactions');
    if (data) {
      setTransactions(data.confirmed || []);
      setPendingTransactions(data.pending || []);
      setBalances(data.balances || { meyan: 0, kushal: 0 });
    }
  };

  const submitTransaction = async (transaction) => {
    // Validate form data
    if (!transaction.particular.trim()) {
      Alert.alert('Validation Error', 'Please enter the particular/description.');
      return;
    }
    
    if (!transaction.total || parseFloat(transaction.total) <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid total amount.');
      return;
    }

    const result = await apiCall('/transactions', 'POST', transaction);
    if (result) {
      Alert.alert('Success', 'Transaction submitted for approval');
      setShowAddModal(false);
      fetchTransactions();
      resetForm();
    }
  };

  const confirmTransaction = async (transactionId, approve) => {
    const result = await apiCall(`/transactions/${transactionId}/confirm`, 'POST', { approve });
    if (result) {
      Alert.alert('Success', approve ? 'Transaction approved' : 'Transaction rejected');
      fetchTransactions();
    }
  };

  const payDebt = async (amount) => {
    const debtTransaction = {
      date: new Date().toISOString().split('T')[0],
      particular: 'Debt Payment',
      total: amount * 2,
      meyanPay: currentUser === 'Meyan' ? amount * 2 : 0,
      kushalPay: currentUser === 'Kushal' ? amount * 2 : 0,
      remarks: `Debt payment: ${currentUser} to ${currentUser === 'Meyan' ? 'Kushal' : 'Meyan'}`
    };
    
    await submitTransaction(debtTransaction);
  };

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      particular: '',
      total: '',
      meyanPay: '',
      kushalPay: '',
      remarks: ''
    });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTransactions();
    setRefreshing(false);
  };

  // Handle Android back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (showAddModal || showUserModal || showDebtModal) {
        setShowAddModal(false);
        setShowUserModal(false);
        setShowDebtModal(false);
        return true;
      }
      return false;
    });

    return () => backHandler.remove();
  }, [showAddModal, showUserModal, showDebtModal]);

  // Load user preference on app start
  useEffect(() => {
    loadUserPreference();
  }, []);

  // Fetch transactions when user changes or app starts
  useEffect(() => {
    if (!isLoading) {
      fetchTransactions();
      const interval = setInterval(fetchTransactions, 30000); // Poll every 30 seconds
      return () => clearInterval(interval);
    }
  }, [currentUser, isLoading]);

  const renderTransaction = (transaction, isPending = false) => (
    <View key={transaction.id} style={styles.transactionCard}>
      <View style={styles.transactionHeader}>
        <Text style={styles.transactionDate}>{transaction.date}</Text>
        <View style={styles.statusContainer}>
          {isPending && (
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingText}>Pending</Text>
            </View>
          )}
        </View>
      </View>
      
      <View style={styles.transactionBody}>
        <Text style={styles.particular}>{transaction.particular}</Text>
        <View style={styles.amountRow}>
          <View style={styles.amountCard}>
            <Text style={styles.amountLabel}>Total</Text>
            <Text style={styles.amountValue}>₹{transaction.total}</Text>
          </View>
          <View style={styles.amountCard}>
            <Text style={styles.amountLabel}>Meyan</Text>
            <Text style={styles.amountValue}>₹{transaction.meyanPay}</Text>
          </View>
          <View style={styles.amountCard}>
            <Text style={styles.amountLabel}>Kushal</Text>
            <Text style={styles.amountValue}>₹{transaction.kushalPay}</Text>
          </View>
        </View>
        
        {transaction.remarks && (
          <Text style={styles.remarks}>{transaction.remarks}</Text>
        )}
      </View>
      
      {isPending && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.approveButton]}
            onPress={() => confirmTransaction(transaction.id, true)}
            activeOpacity={0.7}
          >
            <MaterialIcons name="check" size={20} color="white" />
            <Text style={styles.actionButtonText}>Approve</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => confirmTransaction(transaction.id, false)}
            activeOpacity={0.7}
          >
            <MaterialIcons name="close" size={20} color="white" />
            <Text style={styles.actionButtonText}>Reject</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderAddModal = () => (
    <Modal 
      visible={showAddModal} 
      animationType="slide" 
      transparent
      statusBarTranslucent
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add New Transaction</Text>
            <TouchableOpacity 
              onPress={() => setShowAddModal(false)}
              activeOpacity={0.7}
            >
              <MaterialIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.formContainer} keyboardShouldPersistTaps="handled">
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Date</Text>
              <TextInput
                style={styles.input}
                value={formData.date}
                onChangeText={(text) => setFormData({...formData, date: text})}
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Particular *</Text>
              <TextInput
                style={styles.input}
                value={formData.particular}
                onChangeText={(text) => setFormData({...formData, particular: text})}
                placeholder="What was this expense for?"
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Total Amount *</Text>
              <TextInput
                style={styles.input}
                value={formData.total}
                onChangeText={(text) => setFormData({...formData, total: text})}
                placeholder="0"
                keyboardType="numeric"
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Meyan's Payment</Text>
              <TextInput
                style={styles.input}
                value={formData.meyanPay}
                onChangeText={(text) => setFormData({...formData, meyanPay: text})}
                placeholder="0"
                keyboardType="numeric"
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Kushal's Payment</Text>
              <TextInput
                style={styles.input}
                value={formData.kushalPay}
                onChangeText={(text) => setFormData({...formData, kushalPay: text})}
                placeholder="0"
                keyboardType="numeric"
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Remarks</Text>
              <TextInput
                style={styles.input}
                value={formData.remarks}
                onChangeText={(text) => setFormData({...formData, remarks: text})}
                placeholder="Additional notes..."
                multiline
              />
            </View>
          </ScrollView>
          
          <TouchableOpacity
            style={styles.submitButton}
            onPress={() => submitTransaction(formData)}
            activeOpacity={0.7}
          >
            <Text style={styles.submitButtonText}>Submit Transaction</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderUserModal = () => (
    <Modal 
      visible={showUserModal} 
      animationType="fade" 
      transparent
      statusBarTranslucent
    >
      <View style={styles.modalOverlay}>
        <View style={styles.userModalContent}>
          <Text style={styles.userModalTitle}>Select User</Text>
          <TouchableOpacity
            style={[styles.userButton, currentUser === 'Meyan' && styles.selectedUser]}
            onPress={() => handleUserSelection('Meyan')}
            activeOpacity={0.7}
          >
            <FontAwesome5 name="user-circle" size={40} color={currentUser === 'Meyan' ? '#4F46E5' : '#666'} />
            <Text style={[styles.userName, currentUser === 'Meyan' && styles.selectedUserName]}>Meyan</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.userButton, currentUser === 'Kushal' && styles.selectedUser]}
            onPress={() => handleUserSelection('Kushal')}
            activeOpacity={0.7}
          >
            <FontAwesome5 name="user-circle" size={40} color={currentUser === 'Kushal' ? '#4F46E5' : '#666'} />
            <Text style={[styles.userName, currentUser === 'Kushal' && styles.selectedUserName]}>Kushal</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderDebtModal = () => (
    <Modal 
      visible={showDebtModal} 
      animationType="slide" 
      transparent
      statusBarTranslucent
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Pay Debt</Text>
            <TouchableOpacity 
              onPress={() => setShowDebtModal(false)}
              activeOpacity={0.7}
            >
              <MaterialIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Enter amount to pay</Text>
            <TextInput
              style={styles.input}
              value={debtAmount}
              onChangeText={setDebtAmount}
              keyboardType="numeric"
              placeholder="0"
            />
          </View>

          <TouchableOpacity
            style={styles.submitButton}
            onPress={() => {
              const amount = parseFloat(debtAmount);
              if (isNaN(amount) || amount <= 0) {
                Alert.alert('Invalid Amount', 'Please enter a valid amount.');
                return;
              }
              setShowDebtModal(false);
              setDebtAmount('');
              payDebt(amount);
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.submitButtonText}>Pay ₹{debtAmount || '...'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <StatusBar barStyle="light-content" backgroundColor="#4F46E5" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4F46E5" />
      
      <LinearGradient colors={['#4F46E5', '#7C3AED']} style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity 
            onPress={() => setShowUserModal(true)}
            activeOpacity={0.7}
          >
            <View style={styles.userInfo}>
              <FontAwesome5 name="user-circle" size={30} color="white" />
              <Text style={styles.headerUser}>{currentUser}</Text>
            </View>
          </TouchableOpacity>
          
          <View style={styles.connectionStatus}>
            <View style={[styles.statusDot, { backgroundColor: isConnected ? '#10B981' : '#EF4444' }]} />
            <Text style={styles.statusText}>{isConnected ? 'Connected' : 'Offline'}</Text>
          </View>
        </View>
        
        <Text style={styles.headerTitle}>Expense Tracker</Text>
        
        <View style={styles.balanceContainer}>
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Meyan owes</Text>
            <Text style={styles.balanceAmount}>₹{balances.meyan}</Text>
          </View>
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Kushal owes</Text>
            <Text style={styles.balanceAmount}>₹{balances.kushal}</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        keyboardShouldPersistTaps="handled"
      >
        {pendingTransactions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pending Approvals</Text>
            {pendingTransactions.map(transaction => renderTransaction(transaction, true))}
          </View>
        )}
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transaction History</Text>
          {transactions.length > 0 ? (
            transactions.map(transaction => renderTransaction(transaction))
          ) : (
            <Text style={styles.emptyText}>No transactions yet</Text>
          )}
        </View>
      </ScrollView>

      <View style={styles.bottomActions}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => setShowDebtModal(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="card" size={20} color="white" />
          <Text style={styles.actionBtnText}>Pay Debt</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionBtn, styles.primaryAction]}
          onPress={() => setShowAddModal(true)}
          activeOpacity={0.7}
        >
          <MaterialIcons name="add" size={24} color="white" />
          <Text style={styles.actionBtnText}>Add Transaction</Text>
        </TouchableOpacity>
      </View>

      {/* Made by attribution */}
      <View style={styles.attribution}>
        <Text style={styles.attributionText}>Made with ❤️ by Meyan Adhikari</Text>
      </View>

      {renderAddModal()}
      {renderUserModal()}
      {renderDebtModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  header: {
    padding: 20,
    paddingTop: 50,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerUser: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 10,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    color: 'white',
    fontSize: 14,
  },
  headerTitle: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  balanceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  balanceCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 15,
    borderRadius: 12,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  balanceLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    marginBottom: 5,
  },
  balanceAmount: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 20,
    paddingBottom: 50,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 15,
  },
  transactionCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  transactionDate: {
    fontSize: 14,
    color: '#6B7280',
  },
  statusContainer: {
    flexDirection: 'row',
  },
  pendingBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pendingText: {
    color: '#92400E',
    fontSize: 12,
    fontWeight: '600',
  },
  transactionBody: {
    marginBottom: 10,
  },
  particular: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 10,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  amountCard: {
    alignItems: 'center',
    flex: 1,
  },
  amountLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  amountValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  remarks: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
    marginTop: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  approveButton: {
    backgroundColor: '#10B981',
  },
  rejectButton: {
    backgroundColor: '#EF4444',
  },
  actionButtonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 5,
  },
  bottomActions: {
    flexDirection: 'row',
    padding: 20,
    paddingBottom: 30,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6B7280',
    padding: 15,
    borderRadius: 12,
    marginHorizontal: 5,
  },
  primaryAction: {
    backgroundColor: '#4F46E5',
  },
  actionBtnText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 5,
  },
  emptyText: {
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 16,
    marginTop: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  formContainer: {
    maxHeight: 400,
  },
  inputGroup: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#F9FAFB',
  },
  submitButton: {
    backgroundColor: '#4F46E5',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  userModalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 30,
    width: '80%',
    alignItems: 'center',
  },
  userModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 20,
  },
  userButton: {
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    marginVertical: 10,
    width: '100%',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedUser: {
    borderColor: '#4F46E5',
    backgroundColor: '#F0F9FF',
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 8,
  },
  selectedUserName: {
    color: '#4F46E5',
  },
  attribution: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    alignItems: 'center',
  },
  attributionText: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
    textAlign: 'center',
  },
});

export default ExpenseTracker;