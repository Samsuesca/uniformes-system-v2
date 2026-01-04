import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * Global Product Modal - Create/Edit Global Product Form
 * For products shared across all schools (Tennis, Zapatos, Medias, etc.)
 * Only accessible by superusers
 */
import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { productService } from '../services/productService';
export default function GlobalProductModal({ isOpen, onClose, onSuccess, product }) {
    const [loading, setLoading] = useState(false);
    const [garmentTypes, setGarmentTypes] = useState([]);
    const [error, setError] = useState(null);
    const [formData, setFormData] = useState({
        garment_type_id: '',
        name: '',
        size: '',
        color: '',
        gender: 'unisex',
        price: '',
        cost: '',
        description: '',
        image_url: '',
        is_active: true,
    });
    useEffect(() => {
        if (isOpen) {
            loadGlobalGarmentTypes();
            if (product) {
                // Edit mode
                setFormData({
                    garment_type_id: product.garment_type_id || '',
                    name: product.name || '',
                    size: product.size,
                    color: product.color || '',
                    gender: product.gender || 'unisex',
                    price: product.price.toString(),
                    cost: product.cost?.toString() || '',
                    description: product.description || '',
                    image_url: product.image_url || '',
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
                    gender: 'unisex',
                    price: '',
                    cost: '',
                    description: '',
                    image_url: '',
                    is_active: true,
                });
            }
            setError(null);
        }
    }, [isOpen, product]);
    const loadGlobalGarmentTypes = async () => {
        try {
            const types = await productService.getGlobalGarmentTypes();
            setGarmentTypes(types);
        }
        catch (err) {
            console.error('Error loading global garment types:', err);
            setError('Error al cargar tipos de prenda globales');
        }
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const data = {
                garment_type_id: formData.garment_type_id,
                size: formData.size,
                price: parseFloat(formData.price),
            };
            // Optional fields
            if (formData.name.trim())
                data.name = formData.name.trim();
            if (formData.color.trim())
                data.color = formData.color.trim();
            if (formData.gender)
                data.gender = formData.gender;
            if (formData.cost.trim())
                data.cost = parseFloat(formData.cost);
            if (formData.description.trim())
                data.description = formData.description.trim();
            if (formData.image_url.trim())
                data.image_url = formData.image_url.trim();
            if (product)
                data.is_active = formData.is_active;
            if (product) {
                // Update existing product
                await productService.updateGlobalProduct(product.id, data);
            }
            else {
                // Create new product
                await productService.createGlobalProduct(data);
            }
            onSuccess();
            onClose();
        }
        catch (err) {
            console.error('Error saving global product:', err);
            setError(err.response?.data?.detail || 'Error al guardar producto global');
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
    return (_jsxs("div", { className: "fixed inset-0 z-50 overflow-y-auto", children: [_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50 transition-opacity", onClick: onClose }), _jsx("div", { className: "flex min-h-screen items-center justify-center p-4", children: _jsxs("div", { className: "relative bg-white rounded-lg shadow-xl max-w-2xl w-full", children: [_jsxs("div", { className: "flex items-center justify-between p-6 border-b border-gray-200", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-xl font-semibold text-gray-800", children: product ? 'Editar Producto Global' : 'Nuevo Producto Global' }), _jsx("p", { className: "text-sm text-gray-500 mt-1", children: "Producto compartido entre todos los colegios" })] }), _jsx("button", { onClick: onClose, className: "text-gray-400 hover:text-gray-600 transition", children: _jsx(X, { className: "w-6 h-6" }) })] }), _jsxs("form", { onSubmit: handleSubmit, className: "p-6 space-y-4", children: [error && (_jsx("div", { className: "bg-red-50 border border-red-200 rounded-lg p-3", children: _jsx("p", { className: "text-sm text-red-700", children: error }) })), product && (_jsxs("div", { className: "bg-blue-50 border border-blue-200 rounded-lg p-3", children: [_jsxs("p", { className: "text-sm text-blue-700", children: [_jsx("span", { className: "font-medium", children: "C\u00F3digo:" }), " ", product.code] }), _jsx("p", { className: "text-xs text-blue-600 mt-1", children: "El c\u00F3digo se genera autom\u00E1ticamente y no se puede modificar" })] })), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Tipo de Prenda Global *" }), _jsxs("select", { name: "garment_type_id", value: formData.garment_type_id, onChange: handleChange, required: true, className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none", children: [_jsx("option", { value: "", children: "Selecciona un tipo" }), garmentTypes.map((type) => (_jsx("option", { value: type.id, children: type.name }, type.id)))] }), _jsx("p", { className: "text-xs text-gray-500 mt-1", children: "Ej: Tennis, Zapatos, Medias, Jean, Blusa" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Nombre del Producto" }), _jsx("input", { type: "text", name: "name", value: formData.name, onChange: handleChange, placeholder: "Opcional - Se genera autom\u00E1ticamente si se deja vac\u00EDo", className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none" })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Talla *" }), _jsx("input", { type: "text", name: "size", value: formData.size, onChange: handleChange, required: true, maxLength: 20, placeholder: "Ej: T27-T34, \u00DAnica, L", className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Color" }), _jsx("input", { type: "text", name: "color", value: formData.color, onChange: handleChange, placeholder: "Ej: Negro, Azul", className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "G\u00E9nero" }), _jsxs("select", { name: "gender", value: formData.gender, onChange: handleChange, className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none", children: [_jsx("option", { value: "unisex", children: "Unisex" }), _jsx("option", { value: "male", children: "Masculino" }), _jsx("option", { value: "female", children: "Femenino" })] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Precio de Venta *" }), _jsxs("div", { className: "relative", children: [_jsx("span", { className: "absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500", children: "$" }), _jsx("input", { type: "number", name: "price", value: formData.price, onChange: handleChange, required: true, min: "0", step: "0.01", placeholder: "0.00", className: "w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Costo de Compra" }), _jsxs("div", { className: "relative", children: [_jsx("span", { className: "absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500", children: "$" }), _jsx("input", { type: "number", name: "cost", value: formData.cost, onChange: handleChange, min: "0", step: "0.01", placeholder: "0.00", className: "w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none" })] }), _jsx("p", { className: "text-xs text-gray-500 mt-1", children: "Opcional - Para c\u00E1lculo de margen" })] })] }), formData.price && formData.cost && parseFloat(formData.cost) > 0 && (_jsx("div", { className: "bg-green-50 border border-green-200 rounded-lg p-3", children: _jsxs("p", { className: "text-sm text-green-700", children: [_jsx("span", { className: "font-medium", children: "Margen de ganancia:" }), ' ', "$", (parseFloat(formData.price) - parseFloat(formData.cost)).toFixed(2), " (", (((parseFloat(formData.price) - parseFloat(formData.cost)) / parseFloat(formData.price)) * 100).toFixed(1), "%)"] }) })), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Descripci\u00F3n" }), _jsx("textarea", { name: "description", value: formData.description, onChange: handleChange, rows: 3, placeholder: "Descripci\u00F3n opcional del producto", className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none resize-none" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "URL de Imagen" }), _jsx("input", { type: "url", name: "image_url", value: formData.image_url, onChange: handleChange, placeholder: "https://ejemplo.com/imagen.jpg", className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none" })] }), product && (_jsxs("div", { className: "flex items-center gap-3 p-3 bg-gray-50 rounded-lg", children: [_jsxs("label", { className: "relative inline-flex items-center cursor-pointer", children: [_jsx("input", { type: "checkbox", name: "is_active", checked: formData.is_active, onChange: (e) => setFormData({ ...formData, is_active: e.target.checked }), className: "sr-only peer" }), _jsx("div", { className: "w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500" })] }), _jsxs("div", { children: [_jsx("span", { className: "text-sm font-medium text-gray-700", children: formData.is_active ? 'Producto Activo' : 'Producto Inactivo' }), _jsx("p", { className: "text-xs text-gray-500", children: formData.is_active
                                                        ? 'El producto está visible y disponible para ventas'
                                                        : 'El producto está oculto y no se puede vender' })] })] })), _jsxs("div", { className: "flex gap-3 pt-4", children: [_jsx("button", { type: "button", onClick: onClose, disabled: loading, className: "flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition disabled:opacity-50", children: "Cancelar" }), _jsx("button", { type: "submit", disabled: loading, className: "flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center justify-center", children: loading ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "w-4 h-4 mr-2 animate-spin" }), "Guardando..."] })) : (product ? 'Actualizar' : 'Crear Producto Global') })] })] })] }) })] }));
}
