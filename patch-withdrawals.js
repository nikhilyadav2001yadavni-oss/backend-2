const fs = require('fs');
const p = 'C:/Users/abhay/Desktop/W-Invest Project/winvest-admin/app/withdrawals/page.tsx';
let c = fs.readFileSync(p, 'utf8');

// ── 1. Add ModalFooter to the Modal import ─────────────────────────────────
c = c.replace(
  "import { Modal } from '@/components/ui/Modal'",
  "import { Modal, ModalFooter } from '@/components/ui/Modal'"
);

// ── 2. Add new state variables after isDetailsModalOpen state ─────────────
const afterDetailsState = "  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)\r\n  const [filtersExpanded, setFiltersExpanded] = useState(false)";
const afterDetailsStateNew = "  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)\r\n  const [filtersExpanded, setFiltersExpanded] = useState(false)\r\n  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false)\r\n  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false)\r\n  const [processingWithdrawal, setProcessingWithdrawal] = useState<WithdrawalListItem | null>(null)\r\n  const [txHash, setTxHash] = useState('')\r\n  const [rejectReason, setRejectReason] = useState('')\r\n  const [processLoading, setProcessLoading] = useState(false)\r\n  const [processError, setProcessError] = useState<string | null>(null)";

if (c.includes(afterDetailsState)) {
  c = c.replace(afterDetailsState, afterDetailsStateNew);
  console.log('States added');
} else {
  console.log('MISS: details state pattern');
}

// ── 3. Add handler functions before the return statement ──────────────────
const beforeReturn = "  return (\r\n    <MainLayout>";
const handlers = `  const handleOpenApprove = (withdrawal: WithdrawalListItem) => {
    setProcessingWithdrawal(withdrawal)
    setTxHash('')
    setProcessError(null)
    setIsApproveModalOpen(true)
  }

  const handleOpenReject = (withdrawal: WithdrawalListItem) => {
    setProcessingWithdrawal(withdrawal)
    setRejectReason('')
    setProcessError(null)
    setIsRejectModalOpen(true)
  }

  const handleApproveSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!processingWithdrawal || !txHash.trim()) return
    setProcessLoading(true)
    setProcessError(null)
    withdrawalAPI
      .process(processingWithdrawal.transactionId, 'APPROVE', txHash.trim())
      .then(() => {
        setIsApproveModalOpen(false)
        fetchWithdrawals()
      })
      .catch((err: any) => setProcessError(err.response?.data?.message || 'Failed to approve withdrawal'))
      .finally(() => setProcessLoading(false))
  }

  const handleRejectSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!processingWithdrawal || !rejectReason.trim()) return
    setProcessLoading(true)
    setProcessError(null)
    withdrawalAPI
      .process(processingWithdrawal.transactionId, 'REJECT', undefined, rejectReason.trim())
      .then(() => {
        setIsRejectModalOpen(false)
        fetchWithdrawals()
      })
      .catch((err: any) => setProcessError(err.response?.data?.message || 'Failed to reject withdrawal'))
      .finally(() => setProcessLoading(false))
  }

  return (
    <MainLayout>`;

if (c.includes(beforeReturn)) {
  c = c.replace(beforeReturn, handlers);
  console.log('Handlers added');
} else {
  console.log('MISS: beforeReturn. Trying LF...');
  const lf = "  return (\n    <MainLayout>";
  if (c.includes(lf)) {
    c = c.replace(lf, handlers.replace(/\r\n/g, '\n'));
    console.log('Handlers added (LF)');
  }
}

// ── 4. Add Actions column header to table ─────────────────────────────────
const oldHeader = "<TableHead className=\"py-2 px-2 sm:px-3 text-xs whitespace-nowrap\">Date</TableHead>\r\n                  <TableHead className=\"py-2 px-2 sm:px-3 text-xs whitespace-nowrap\">Actions</TableHead>";
// Find the existing headers
const actionsHeader = c.indexOf('<TableHead className="py-2 px-2 sm:px-3 text-xs whitespace-nowrap">Actions</TableHead>');
console.log('Actions header already exists:', actionsHeader > -1);

// ── 5. Add Approve/Reject buttons to each table row ───────────────────────
// Find the View button cell and add Approve/Reject before it
const viewCell = `                      <TableCell className="py-2 px-2 sm:px-3 whitespace-nowrap">
                        <Button
                          size="sm"
                          variant="ghost"
                          leftIcon={<Eye className="w-3 h-3" />}
                          className="text-xs px-2 py-1 shrink-0"
                          onClick={() => handleViewDetails(withdrawal)}
                          title="View details"
                        >
                          View
                        </Button>
                      </TableCell>`;

const newActionCell = `                      <TableCell className="py-2 px-2 sm:px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1 flex-wrap">
                          <Button
                            size="sm"
                            variant="ghost"
                            leftIcon={<Eye className="w-3 h-3" />}
                            className="text-xs px-2 py-1 shrink-0"
                            onClick={() => handleViewDetails(withdrawal)}
                            title="View details"
                          >
                            View
                          </Button>
                          {withdrawal.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                variant="primary"
                                leftIcon={<CheckCircle className="w-3 h-3" />}
                                className="text-xs px-2 py-1 shrink-0"
                                onClick={() => handleOpenApprove(withdrawal)}
                                title="Approve withdrawal"
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="danger"
                                leftIcon={<XCircle className="w-3 h-3" />}
                                className="text-xs px-2 py-1 shrink-0"
                                onClick={() => handleOpenReject(withdrawal)}
                                title="Reject withdrawal"
                              >
                                Reject
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>`;

if (c.includes(viewCell)) {
  c = c.replace(viewCell, newActionCell);
  console.log('Action buttons added to table rows');
} else {
  // Try CRLF variant
  const viewCellCRLF = viewCell.replace(/\n/g, '\r\n');
  if (c.includes(viewCellCRLF)) {
    c = c.replace(viewCellCRLF, newActionCell.replace(/\n/g, '\r\n'));
    console.log('Action buttons added (CRLF)');
  } else {
    console.log('MISS: view cell - trying partial match');
    const partial = 'onClick={() => handleViewDetails(withdrawal)}';
    console.log('partial found:', c.includes(partial));
  }
}

// ── 6. Add Approve and Reject modals before closing </MainLayout> ─────────
const beforeMainLayoutClose = "    </MainLayout>\r\n  )\r\n}";
const beforeMainLayoutCloseLF = "    </MainLayout>\n  )\n}";

const approveRejectModals = `
      {/* Approve Withdrawal Modal */}
      <Modal
        isOpen={isApproveModalOpen}
        onClose={() => setIsApproveModalOpen(false)}
        title="Approve Withdrawal"
        size="md"
      >
        {processingWithdrawal && (
          <form onSubmit={handleApproveSubmit} className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-lg space-y-1 text-sm">
              <p><span className="text-gray-500">User:</span> <span className="font-medium">{processingWithdrawal.userName}</span></p>
              <p><span className="text-gray-500">Amount:</span> <span className="font-medium text-danger-600">{formatCurrency(processingWithdrawal.amount)} {proces
