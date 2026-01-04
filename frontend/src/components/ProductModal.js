import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * Product Modal - Create/Edit Product Form
 */
import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { productService } from '../services/productService';
export default function ProductModal({ isOpen, onClose, onSuccess, schoolId, product }) {
    const [loading, setLoading] = useState(false);
    const [garmentTypes, setGarmentTypes] = useState([]);
    const [error, setError] = useState(null);
    const [formData, setFormData] = useState({
        garment_type_id: '',
        name: '',
        size: '',
        color: '',
        gender: 'Unisex',
        price: '',
        is_active: true,
    });
    useEffect(() => {
        if (isOpen) {
            loadGarmentTypes();
            if (product) {
                // Edit mode
                setFormData({
                    garment_type_id: product.garment_type_id || '',
                    name: product.name || '',
                    size: product.size,
                    color: product.color || '',
                    gender: product.gender || 'Unisex',
                    price: product.price.toString(),
                    is_active: product.is_active ?? true,
                });
            }
            else {
                // Create mode - reset form
                setFormData({
                    garment_type_id: '',
                    name: '',
                    size: '',
                    color: '',
                    gender: 'Unisex',
                    price: '',
                    is_active: true,
                });
            }
            setError(null);
        }
    }, [isOpen, product]);
    const loadGarmentTypes = async () => {
        try {
            const types = await productService.getGarmentTypes(schoolId);
            setGarmentTypes(types);
        }
        catch (err) {
            console.error('Error loading garment types:', err);
            setError('Error al cargar tipos de prenda');
        }
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const data = {
                ...formData,
                price: parseFloat(formData.price),
            };
            if (product) {
                // Update existing product
                await productService.updateProduct(schoolId, product.id, data);
            }
            else {
                // Create new product
                await productService.createProduct(schoolId, data);
            }
            onSuccess();
            onClose();
        }
        catch (err) {
            console.error('Error saving product:', err);
            setError(err.response?.data?.detail || 'Error al guardar producto');
        }
        finally {
            setLoading(false);
        }
    };
    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };
    if (!isOpen)
        return null;
    return (_jsxs("div", { className: "fixed inset-0 z-50 overflow-y-auto", children: [_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50 transition-opacity", onClick: onClose }), _jsx("div", { className: "flex min-h-screen items-center justify-center p-4", children: _jsxs("div", { className: "relative bg-white rounded-lg shadow-xl max-w-md w-full", children: [_jsxs("div", { className: "flex items-center justify-between p-6 border-b border-gray-200", children: [_jsx("h2", { className: "text-xl font-semibold text-gray-800", children: product ? 'Editar Producto' : 'Nuevo Producto' }), _jsx("button", { onClick: onClose, className: "text-gray-400 hover:text-gray-600 transition", children: _jsx(X, { className: "w-6 h-6" }) })] }), _jsxs("form", { onSubmit: handleSubmit, className: "p-6 space-y-4", children: [error && (_jsx("div", { className: "bg-red-50 border border-red-200 rounded-lg p-3", children: _jsx("p", { className: "text-sm text-red-700", children: error }) })), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Tipo de Prenda *" }), _jsxs("select", { name: "garment_type_id", value: formData.garment_type_id, onChange: handleChange, required: true, className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none", children: [_jsx("option", { value: "", children: "Selecciona un tipo" }), garmentTypes.map((type) => (_jsx("option", { value: type.id, children: type.name }, type.id)))] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Nombre del Producto *" }), _jsx("input", { type: "text", name: "name", value: formData.name, onChange: handleChange, required: true, placeholder: "Ej: Camisa Polo Azul", className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Talla *" }), _jsx("input", { type: "text", name: "size", value: formData.size, onChange: handleChange, required: true, placeholder: "Ej: M, 14, 32", className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Color" }), _jsx("input", { type: "text", name: "color", value: formData.color, onChange: handleChange, placeholder: "Ej: Azul", className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "G\u00E9nero" }), _jsxs("select", { name: "gender", value: formData.gender, onChange: handleChange, className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none", children: [_jsx("option", { value: "Unisex", children: "Unisex" }), _jsx("option", { value: "Masculino", children: "Masculino" }), _jsx("option", { value: "Femenino", children: "Femenino" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Precio *" }), _jsxs("div", { className: "relative", children: [_jsx("span", { className: "absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500", children: "$" }), _jsx("input", { type: "number", name: "price", value: formData.price, onChange: handleChange, required: true, min: "0", step: "0.01", placeholder: "0.00", className: "w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" })] })] }), product && (_jsxs("div", { className: "flex items-center gap-3 p-3 bg-gray-50 rounded-lg", children: [_jsxs("label", { className: "relative inline-flex items-center cursor-pointer", children: [_jsx("input", { type: "checkbox", name: "is_active", checked: formData.is_active, onChange: (e) => setFormData({ ...formData, is_active: e.target.checked }), className: "sr-only peer" }), _jsx("div", { className: "w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500" })] }), _jsxs("div", { children: [_jsx("span", { className: "text-sm font-medium text-gray-700", children: formData.is_active ? 'Producto Activo' : 'Producto Inactivo' }), _jsx("p", { className: "text-xs text-gray-500", children: formData.is_active
                                                        ? 'El producto está visible y disponible para ventas'
                                                        : 'El producto está oculto y no se puede vender' })] })] })), _jsxs("div", { className: "flex gap-3 pt-4", children: [_jsx("button", { type: "button", onClick: onClose, disabled: loading, className: "flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition disabled:opacity-50", children: "Cancelar" }), _jsx("button", { type: "submit", disabled: loading, className: "flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center", children: loading ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "w-4 h-4 mr-2 animate-spin" }), "Guardando..."] })) : (product ? 'Actualizar' : 'Crear Producto') })] })] })] }) })] }));
}
