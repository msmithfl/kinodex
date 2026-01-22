import { useState, useEffect } from 'react'
import LoadingSpinner from '../components/LoadingSpinner'
import EmptyState from '../components/EmptyState'
import ConfirmDialog from '../components/ConfirmDialog'
import { FaPencilAlt, FaTrash, FaPlus, FaEnvelope, FaPhone } from 'react-icons/fa'
import { IoPersonCircleSharp } from 'react-icons/io5'
import { getRelativeTimeString } from '../utils/dateUtils'
import type { Customer } from '../types'

function CustomersView() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [deleteCustomer, setDeleteCustomer] = useState<Customer | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  })
  const [error, setError] = useState('')

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5156'
  const API_URL = `${API_BASE}/api/customers`

  useEffect(() => {
    fetchCustomers()
  }, [])

  const fetchCustomers = async () => {
    try {
      const response = await fetch(API_URL)
      if (response.ok) {
        const data = await response.json()
        setCustomers(data)
      }
    } catch (error) {
      console.error('Error fetching customers:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.name.trim()) {
      setError('Name is required')
      return
    }

    try {
      const url = editingCustomer ? `${API_URL}/${editingCustomer.id}` : API_URL
      const method = editingCustomer ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        await fetchCustomers()
        handleCloseModal()
      } else {
        setError('Failed to save customer')
      }
    } catch (error) {
      console.error('Error saving customer:', error)
      setError('An error occurred while saving')
    }
  }

  const handleDelete = async () => {
    if (!deleteCustomer?.id) return

    try {
      const response = await fetch(`${API_URL}/${deleteCustomer.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchCustomers()
        setDeleteCustomer(null)
      } else {
        const data = await response.json()
        setError(data.message || 'Failed to delete customer')
      }
    } catch (error) {
      console.error('Error deleting customer:', error)
      setError('An error occurred while deleting')
    }
  }

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer)
    setFormData({
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
    })
    setShowAddModal(true)
  }

  const handleCloseModal = () => {
    setShowAddModal(false)
    setEditingCustomer(null)
    setFormData({ name: '', email: '', phone: '' })
    setError('')
  }

  const getActiveCheckouts = (customer: Customer) => {
    return customer.checkouts?.filter(ch => !ch.returnedDate).length || 0
  }

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.phone.includes(searchQuery)
  )

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <IoPersonCircleSharp className="text-indigo-400" />
            Customers
          </h1>
          <p className="text-gray-400 mt-1">
            {customers.length} {customers.length === 1 ? 'customer' : 'customers'}
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
        >
          <FaPlus />
          Add Customer
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search customers by name, email, or phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500"
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {/* Customers List */}
      {filteredCustomers.length === 0 ? (
        <EmptyState
          message={searchQuery ? "No customers found. Try adjusting your search." : "No customers yet. Add your first customer to get started."}
          showAddButton={false}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredCustomers.map((customer) => {
            const activeCheckouts = getActiveCheckouts(customer)
            return (
              <div
                key={customer.id}
                className="bg-gray-800 border border-gray-700 rounded-lg p-6 hover:border-indigo-500 transition-colors"
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-semibold text-white">{customer.name}</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(customer)}
                      className="p-2 text-gray-400 hover:text-indigo-400 transition-colors"
                      title="Edit customer"
                    >
                      <FaPencilAlt />
                    </button>
                    <button
                      onClick={() => setDeleteCustomer(customer)}
                      className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                      title="Delete customer"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  {customer.email && (
                    <div className="flex items-center gap-2 text-gray-400">
                      <FaEnvelope className="shrink-0" />
                      <a
                        href={`mailto:${customer.email}`}
                        className="hover:text-indigo-400 transition-colors truncate"
                      >
                        {customer.email}
                      </a>
                    </div>
                  )}
                  {customer.phone && (
                    <div className="flex items-center gap-2 text-gray-400">
                      <FaPhone className="shrink-0" />
                      <a
                        href={`tel:${customer.phone}`}
                        className="hover:text-indigo-400 transition-colors"
                      >
                        {customer.phone}
                      </a>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-700 flex justify-between items-center text-sm">
                  <span className="text-gray-400">
                    Active checkouts: <span className="text-white font-semibold">{activeCheckouts}</span>
                  </span>
                  {customer.createdAt && (
                    <span className="text-gray-500 text-xs">
                      {getRelativeTimeString(customer.createdAt)}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold text-white mb-4">
              {editingCustomer ? 'Edit Customer' : 'Add Customer'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                >
                  {editingCustomer ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteCustomer !== null}
        title="Delete Customer"
        message={deleteCustomer ? `Are you sure you want to delete ${deleteCustomer.name}? This action cannot be undone.` : ''}
        onConfirm={handleDelete}
        onCancel={() => {
          setDeleteCustomer(null)
          setError('')
        }}
        confirmText="Delete"
      />
    </div>
  )
}

export default CustomersView
