import { supabase, sessionManager, dbService, utils } from '../../core/supabase.js';

class RechargeManager {
    constructor() {
        this.currentAdmin = null;
        this.selectedRecharges = new Set();
        this.dataTable = null;
        this.filters = {};
        
        this.init();
    }
    
    async init() {
        console.log('[RechargeManager] Initializing...');
        
        // Check admin authentication
        await this.checkAdminAccess();
        
        // Initialize DataTable
        this.initDataTable();
        
        // Load initial data
        await this.loadStats();
        await this.loadRecharges();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Start auto refresh
        this.startAutoRefresh();
        
        console.log('[RechargeManager] Initialized successfully');
    }
    
    async checkAdminAccess() {
        try {
            const { user } = await sessionManager.getCurrentUser();
            if (!user) {
                window.location.href = '/pages/auth/login.html';
                return;
            }
            
            const { data: profile } = await supabase
                .from('profiles')
                .select('is_admin, full_name')
                .eq('id', user.id)
                .single();
            
            if (!profile?.is_admin) {
                utils.showToast('Admin access required', 'error');
                setTimeout(() => {
                    window.location.href = '/pages/user/dashboard.html';
                }, 2000);
                return;
            }
            
            this.currentAdmin = {
                ...user,
                ...profile
            };
            
        } catch (error) {
            console.error('[RechargeManager] Admin check failed:', error);
            window.location.href = '/pages/auth/login.html';
        }
    }
    
    initDataTable() {
        this.dataTable = $('#rechargesTable').DataTable({
            ajax: {
                url: '', // We'll handle data manually
                dataSrc: '',
                data: (d) => {
                    // Add custom filters to DataTable request
                    return {
                        ...d,
                        filters: this.filters
                    };
                }
            },
            columns: [
                {
                    data: null,
                    render: (data) => {
                        return `<input type="checkbox" class="select-checkbox" data-id="${data.id}">`;
                    },
                    orderable: false,
                    width: '30px'
                },
                {
                    data: 'order_id',
                    render: (data) => `<code class="text-xs">${data}</code>`
                },
                {
                    data: null,
                    render: (data) => {
                        const user = data.user || {};
                        return `
                            <div>
                                <div class="font-medium">${user.full_name || 'User'}</div>
                                <div class="text-sm text-gray-500">${user.email || ''}</div>
                                <div class="text-xs text-gray-400">ID: ${user.id?.substring(0, 8)}...</div>
                            </div>
                        `;
                    }
                },
                {
                    data: 'amount',
                    render: (data) => {
                        return `<div class="font-bold">${utils.formatCurrency(data)}</div>`;
                    }
                },
                {
                    data: 'payment_method',
                    render: (data) => data || 'N/A'
                },
                {
                    data: 'status',
                    render: (data) => {
                        const statusClass = {
                            pending: 'warning',
                            completed: 'success',
                            failed: 'danger',
                            expired: 'secondary'
                        }[data] || 'secondary';
                        
                        return `<span class="status-badge ${statusClass}">${data}</span>`;
                    }
                },
                {
                    data: 'created_at',
                    render: (data) => utils.formatDate(data, { dateStyle: 'short' })
                },
                {
                    data: null,
                    render: (data) => {
                        return `
                            <div class="flex gap-2">
                                <button class="action-btn view" onclick="rechargeManager.viewRecharge('${data.id}')">
                                    <i class="fas fa-eye"></i>
                                </button>
                                ${data.status === 'pending' ? `
                                    <button class="action-btn approve" onclick="rechargeManager.approveRecharge('${data.id}')">
                                        <i class="fas fa-check"></i>
                                    </button>
                                    <button class="action-btn reject" onclick="rechargeManager.rejectRecharge('${data.id}')">
                                        <i class="fas fa-times"></i>
                                    </button>
                                ` : ''}
                            </div>
                        `;
                    },
                    orderable: false,
                    width: '120px'
                }
            ],
            order: [[6, 'desc']], // Sort by date descending
            pageLength: 25,
            responsive: true,
            dom: 'Bfrtip',
            buttons: [
                'copy', 'csv', 'excel', 'pdf', 'print'
            ],
            language: {
                emptyTable: 'No recharge requests found',
                zeroRecords: 'No matching records found'
            }
        });
        
        // Handle select all checkbox
        $('#selectAll').on('click', (e) => {
            const isChecked = $(e.target).prop('checked');
            $('.select-checkbox').prop('checked', isChecked);
            
            if (isChecked) {
                // Add all visible recharge IDs to selection
                const allIds = this.dataTable.rows({ search: 'applied' }).data().toArray().map(row => row.id);
                this.selectedRecharges = new Set(allIds);
            } else {
                this.selectedRecharges.clear();
            }
            
            this.updateBulkActions();
        });
        
        // Handle individual checkbox clicks
        $('#rechargesTable tbody').on('click', '.select-checkbox', (e) => {
            const rechargeId = $(e.target).data('id');
            
            if ($(e.target).prop('checked')) {
                this.selectedRecharges.add(rechargeId);
            } else {
                this.selectedRecharges.delete(rechargeId);
                $('#selectAll').prop('checked', false);
            }
            
            this.updateBulkActions();
        });
    }
    
    async loadRecharges() {
        try {
            utils.showLoading();
            
            let query = supabase
                .from('payment_requests')
                .select(`
                    *,
                    user:profiles!inner(full_name, email, phone, created_at)
                `);
            
            // Apply filters
            if (this.filters.status) {
                query = query.eq('status', this.filters.status);
            }
            
            if (this.filters.payment_method) {
                query = query.eq('payment_method', this.filters.payment_method);
            }
            
            if (this.filters.date_from && this.filters.date_to) {
                query = query.gte('created_at', this.filters.date_from)
                           .lte('created_at', this.filters.date_to);
            }
            
            if (this.filters.min_amount) {
                query = query.gte('amount', this.filters.min_amount);
            }
            
            if (this.filters.max_amount) {
                query = query.lte('amount', this.filters.max_amount);
            }
            
            if (this.filters.search) {
                query = query.or(`
                    order_id.ilike.%${this.filters.search}%,
                    user.full_name.ilike.%${this.filters.search}%,
                    user.email.ilike.%${this.filters.search}%,
                    utr_number.ilike.%${this.filters.search}%
                `);
            }
            
            // Get data
            const { data: recharges, error } = await query
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            
            // Update DataTable
            if (this.dataTable) {
                this.dataTable.clear();
                this.dataTable.rows.add(recharges || []);
                this.dataTable.draw();
            }
            
        } catch (error) {
            console.error('[RechargeManager] Error loading recharges:', error);
            utils.showToast('Failed to load recharge requests', 'error');
        } finally {
            utils.hideLoading();
        }
    }
    
    async loadStats() {
        try {
            // Get counts by status
            const { data: stats, error } = await supabase
                .from('payment_requests')
                .select('status, amount');
            
            if (error) throw error;
            
            let pendingCount = 0;
            let approvedCount = 0;
            let rejectedCount = 0;
            let totalPendingAmount = 0;
            
            const thisMonth = new Date().getMonth();
            
            (stats || []).forEach(stat => {
                const statDate = new Date(stat.created_at);
                
                switch (stat.status) {
                    case 'pending':
                        pendingCount++;
                        totalPendingAmount += stat.amount || 0;
                        break;
                    case 'completed':
                        if (statDate.getMonth() === thisMonth) {
                            approvedCount++;
                        }
                        break;
                    case 'failed':
                        if (statDate.getMonth() === thisMonth) {
                            rejectedCount++;
                        }
                        break;
                }
            });
            
            // Update UI
            document.getElementById('pendingCount').textContent = pendingCount;
            document.getElementById('approvedCount').textContent = approvedCount;
            document.getElementById('rejectedCount').textContent = rejectedCount;
            document.getElementById('totalAmount').textContent = utils.formatCurrency(totalPendingAmount);
            
        } catch (error) {
            console.error('[RechargeManager] Error loading stats:', error);
        }
    }
    
    applyFilters() {
        this.filters = {
            status: document.getElementById('statusFilter').value,
            payment_method: document.getElementById('methodFilter').value,
            date_from: document.getElementById('dateFrom').value,
            date_to: document.getElementById('dateTo').value,
            min_amount: document.getElementById('minAmount').value,
            max_amount: document.getElementById('maxAmount').value,
            search: document.getElementById('searchInput').value
        };
        
        // Reload data with filters
        this.loadRecharges();
        this.loadStats();
    }
    
    clearFilters() {
        document.getElementById('statusFilter').value = '';
        document.getElementById('methodFilter').value = '';
        document.getElementById('dateFrom').value = '';
        document.getElementById('dateTo').value = '';
        document.getElementById('minAmount').value = '';
        document.getElementById('maxAmount').value = '';
        document.getElementById('searchInput').value = '';
        
        this.filters = {};
        this.loadRecharges();
        this.loadStats();
    }
    
    updateBulkActions() {
        const selectedCount = this.selectedRecharges.size;
        document.getElementById('selectedCount').textContent = selectedCount;
        
        const bulkActions = document.getElementById('bulkActions');
        if (selectedCount > 0) {
            bulkActions.classList.add('show');
        } else {
            bulkActions.classList.remove('show');
        }
    }
    
    clearSelection() {
        this.selectedRecharges.clear();
        $('.select-checkbox').prop('checked', false);
        $('#selectAll').prop('checked', false);
        this.updateBulkActions();
    }
    
    async bulkApprove() {
        if (this.selectedRecharges.size === 0) {
            utils.showToast('No requests selected', 'warning');
            return;
        }
        
        const confirmApprove = confirm(`Approve ${this.selectedRecharges.size} selected recharge requests?`);
        if (!confirmApprove) return;
        
        try {
            utils.showLoading();
            
            for (const rechargeId of this.selectedRecharges) {
                await this.approveSingleRecharge(rechargeId);
            }
            
            utils.showToast(`${this.selectedRecharges.size} recharges approved successfully`, 'success');
            this.clearSelection();
            
            // Refresh data
            await this.loadRecharges();
            await this.loadStats();
            
        } catch (error) {
            console.error('[RechargeManager] Bulk approve error:', error);
            utils.showToast('Failed to approve some recharges', 'error');
        } finally {
            utils.hideLoading();
        }
    }
    
    async bulkReject() {
        if (this.selectedRecharges.size === 0) {
            utils.showToast('No requests selected', 'warning');
            return;
        }
        
        const reason = prompt('Enter rejection reason for all selected requests:', 'Invalid payment');
        if (!reason) return;
        
        try {
            utils.showLoading();
            
            for (const rechargeId of this.selectedRecharges) {
                await this.rejectSingleRecharge(rechargeId, reason);
            }
            
            utils.showToast(`${this.selectedRecharges.size} recharges rejected successfully`, 'success');
            this.clearSelection();
            
            // Refresh data
            await this.loadRecharges();
            await this.loadStats();
            
        } catch (error) {
            console.error('[RechargeManager] Bulk reject error:', error);
            utils.showToast('Failed to reject some recharges', 'error');
        } finally {
            utils.hideLoading();
        }
    }
    
    async approveSingleRecharge(rechargeId) {
        try {
            // Get recharge details
            const { data: recharge, error: fetchError } = await supabase
                .from('payment_requests')
                .select('*, user:profiles!inner(id, balance)')
                .eq('id', rechargeId)
                .single();
            
            if (fetchError) throw fetchError;
            
            if (!recharge || recharge.status !== 'pending') {
                throw new Error('Recharge not found or not pending');
            }
            
            // Update recharge status
            const { error: updateError } = await supabase
                .from('payment_requests')
                .update({
                    status: 'completed',
                    verified_by: this.currentAdmin.id,
                    verified_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', rechargeId);
            
            if (updateError) throw updateError;
            
            // Update user balance
            const newBalance = (recharge.user.balance || 0) + recharge.amount;
            const { error: balanceError } = await supabase
                .from('profiles')
                .update({ balance: newBalance })
                .eq('id', recharge.user.id);
            
            if (balanceError) throw balanceError;
            
            // Create transaction record
            await supabase
                .from('transactions')
                .insert({
                    user_id: recharge.user.id,
                    type: 'deposit',
                    amount: recharge.amount,
                    status: 'completed',
                    reference_id: recharge.order_id,
                    payment_method: recharge.payment_method,
                    details: 'Recharge approved by admin',
                    created_at: new Date().toISOString()
                });
            
            // Create notification for user
            await supabase
                .from('
