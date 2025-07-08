import { toast } from 'react-toastify';

// Track active toasts to prevent duplicates
const activeToasts = new Set();

export const showToast = {
  success: (message, toastId = null) => {
    const id = toastId || `success-${message}`;
    if (activeToasts.has(id)) {
      toast.update(id, {
        render: message,
        type: "success",
        autoClose: 3000,
      });
      return;
    }
    activeToasts.add(id);
    toast.success(message, {
      toastId: id,
      position: "top-right",
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      onClose: () => activeToasts.delete(id),
    });
  },
  
  error: (message, toastId = null) => {
    const id = toastId || `error-${message}`;
    if (activeToasts.has(id)) {
      toast.update(id, {
        render: message,
        type: "error",
        autoClose: 5000,
      });
      return;
    }
    activeToasts.add(id);
    toast.error(message, {
      toastId: id,
      position: "top-right",
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      onClose: () => activeToasts.delete(id),
    });
  },
  
  warning: (message, toastId = null) => {
    const id = toastId || `warning-${message}`;
    if (activeToasts.has(id)) {
      toast.update(id, {
        render: message,
        type: "warning",
        autoClose: 4000,
      });
      return;
    }
    activeToasts.add(id);
    toast.warning(message, {
      toastId: id,
      position: "top-right",
      autoClose: 4000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      onClose: () => activeToasts.delete(id),
    });
  },
  
  info: (message, toastId = null) => {
    const id = toastId || `info-${message}`;
    if (activeToasts.has(id)) {
      toast.update(id, {
        render: message,
        type: "info",
        autoClose: 3000,
      });
      return;
    }
    activeToasts.add(id);
    toast.info(message, {
      toastId: id,
      position: "top-right",
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      onClose: () => activeToasts.delete(id),
    });
  }
};

export const handleError = (error, customMessage = null) => {
  console.error('Error:', error);
  
  let message = customMessage;
  
  if (!message) {
    if (error.response?.data?.message) {
      message = error.response.data.message;
    } else if (error.message) {
      message = error.message;
    } else {
      message = 'An unexpected error occurred. Please try again.';
    }
  }
  
  showToast.error(message);
  return ;
};

export const handleSuccess = (message) => {
  showToast.success(message);
};

export default showToast; 