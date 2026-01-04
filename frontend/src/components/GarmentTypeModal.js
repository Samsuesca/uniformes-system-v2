import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * GarmentType Modal - Create/Edit Garment Type Form
 * Handles both school-specific and global garment types
 * Access: Admin (school) or Superuser (global)
 */
import { useState, useEffect, useRef } from 'react';
import { X, Loader2, Upload, Trash2, Star, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { productService } from '../services/productService';
import { useConfigStore } from '../stores/configStore';
export default function GarmentTypeModal({ isOpen, onClose, onSuccess, garmentType, isGlobal, schoolId, }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    // Image gallery state
    const [images, setImages] = useState([]);
    const [imagesLoading, setImagesLoading] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [imageError, setImageError] = useState(null);
    const fileInputRef = useRef(null);
    const { apiUrl } = useConfigStore();
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        category: '',
        requires_embroidery: false,
        has_custom_measurements: false,
        is_active: true,
    });
    useEffect(() => {
        if (isOpen) {
            if (garmentType) {
                // Edit mode
                setFormData({
                    name: garmentType.name || '',
                    description: garmentType.description || '',
                    category: garmentType.category || '',
                    requires_embroidery: garmentType.requires_embroidery || false,
                    has_custom_measurements: garmentType.has_custom_measurements || false,
                    is_active: garmentType.is_active ?? true,
                });
                // Load images for school-specific garment types
                if (!isGlobal && schoolId) {
                    loadImages();
                }
            }
            else {
                // Create mode - reset form
                setFormData({
                    name: '',
                    description: '',
                    category: '',
                    requires_embroidery: false,
                    has_custom_measurements: false,
                    is_active: true,
                });
                setImages([]);
            }
            setError(null);
            setImageError(null);
        }
    }, [isOpen, garmentType]);
    // Load images for garment type
    const loadImages = async () => {
        if (!garmentType || !schoolId || isGlobal)
            return;
        setImagesLoading(true);
        try {
            const data = await productService.getGarmentTypeImages(schoolId, garmentType.id);
            setImages(data || []);
        }
        catch (err) {
            console.error('Error loading images:', err);
            setImageError('Error al cargar imágenes');
        }
        finally {
            setImagesLoading(false);
        }
    };
    // Handle file selection for upload
    const handleFileSelect = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !garmentType || !schoolId)
            return;
        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            setImageError('Formato no válido. Usa JPG, PNG o WebP');
            return;
        }
        // Validate file size (2MB max)
        if (file.size > 2 * 1024 * 1024) {
            setImageError('La imagen es muy grande. Máximo 2MB');
            return;
        }
        // Check max images
        if (images.length >= 10) {
            setImageError('Máximo 10 imágenes por tipo de prenda');
            return;
        }
        setUploadingImage(true);
        setImageError(null);
        try {
            const newImage = await productService.uploadGarmentTypeImage(schoolId, garmentType.id, file);
            setImages(prev => [...prev, newImage]);
        }
        catch (err) {
            console.error('Error uploading image:', err);
            setImageError(err.response?.data?.detail || 'Error al subir imagen');
        }
        finally {
            setUploadingImage(false);
            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };
    // Handle delete image
    const handleDeleteImage = async (imageId) => {
        if (!garmentType || !schoolId)
            return;
        try {
            await productService.deleteGarmentTypeImage(schoolId, garmentType.id, imageId);
            setImages(prev => prev.filter(img => img.id !== imageId));
        }
        catch (err) {
            console.error('Error deleting image:', err);
            setImageError(err.response?.data?.detail || 'Error al eliminar imagen');
        }
    };
    // Handle set primary image
    const handleSetPrimary = async (imageId) => {
        if (!garmentType || !schoolId)
            return;
        try {
            await productService.setGarmentTypePrimaryImage(schoolId, garmentType.id, imageId);
            // Update local state
            setImages(prev => prev.map(img => ({
                ...img,
                is_primary: img.id === imageId
            })));
        }
        catch (err) {
            console.error('Error setting primary image:', err);
            setImageError(err.response?.data?.detail || 'Error al establecer imagen principal');
        }
    };
    // Get full image URL
    const getImageUrl = (imageUrl) => {
        if (imageUrl.startsWith('http'))
            return imageUrl;
        return `${apiUrl}${imageUrl}`;
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const data = {
                name: formData.name.trim(),
            };
            // Optional fields
            if (formData.description.trim())
                data.description = formData.description.trim();
            if (formData.category)
                data.category = formData.category;
            data.requires_embroidery = formData.requires_embroidery;
            data.has_custom_measurements = formData.has_custom_measurements;
            if (garmentType)
                data.is_active = formData.is_active;
            if (isGlobal) {
                // Global garment type
                if (garmentType) {
                    // Update existing
                    await productService.updateGlobalGarmentType(garmentType.id, data);
                }
                else {
                    // Create new
                    await productService.createGlobalGarmentType(data);
                }
            }
            else {
                // School-specific garment type
                if (!schoolId) {
                    throw new Error('School ID is required for school-specific garment types');
                }
                if (garmentType) {
                    // Update existing
                    await productService.updateGarmentType(schoolId, garmentType.id, data);
                }
                else {
                    // Create new
                    await productService.createGarmentType(schoolId, data);
                }
            }
            onSuccess();
            onClose();
        }
        catch (err) {
            console.error('Error saving garment type:', err);
            setError(err.response?.data?.detail || 'Error al guardar tipo de prenda');
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
    return (_jsxs("div", { className: "fixed inset-0 z-50 overflow-y-auto", children: [_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50 transition-opacity", onClick: onClose }), _jsx("div", { className: "flex min-h-screen items-center justify-center p-4", children: _jsxs("div", { className: "relative bg-white rounded-lg shadow-xl max-w-2xl w-full", children: [_jsxs("div", { className: "flex items-center justify-between p-6 border-b border-gray-200", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-xl font-semibold text-gray-800", children: garmentType ? 'Editar Tipo de Prenda' : 'Nuevo Tipo de Prenda' }), _jsx("p", { className: "text-sm text-gray-500 mt-1", children: isGlobal
                                                ? 'Tipo compartido entre todos los colegios'
                                                : 'Tipo específico del colegio' })] }), _jsx("button", { onClick: onClose, className: "text-gray-400 hover:text-gray-600 transition", children: _jsx(X, { className: "w-6 h-6" }) })] }), _jsxs("form", { onSubmit: handleSubmit, className: "p-6 space-y-4", children: [error && (_jsx("div", { className: "bg-red-50 border border-red-200 rounded-lg p-3", children: _jsx("p", { className: "text-sm text-red-700", children: error }) })), _jsx("div", { className: `${isGlobal ? 'bg-purple-50 border-purple-200' : 'bg-blue-50 border-blue-200'} border rounded-lg p-3`, children: _jsxs("p", { className: `text-sm ${isGlobal ? 'text-purple-700' : 'text-blue-700'}`, children: [_jsx("span", { className: "font-medium", children: "Alcance:" }), ' ', isGlobal ? 'Global (todos los colegios)' : 'Específico del colegio'] }) }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Nombre *" }), _jsx("input", { type: "text", name: "name", value: formData.name, onChange: handleChange, required: true, minLength: 3, maxLength: 100, placeholder: "Ej: Camisa, Pantal\u00F3n, Zapatos", className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" }), _jsx("p", { className: "text-xs text-gray-500 mt-1", children: "Entre 3 y 100 caracteres" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Descripci\u00F3n" }), _jsx("textarea", { name: "description", value: formData.description, onChange: handleChange, rows: 3, placeholder: "Descripci\u00F3n opcional del tipo de prenda", className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Categor\u00EDa" }), _jsxs("select", { name: "category", value: formData.category, onChange: handleChange, className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none", children: [_jsx("option", { value: "", children: "Sin categor\u00EDa" }), _jsx("option", { value: "uniforme_diario", children: "Uniforme Diario" }), _jsx("option", { value: "uniforme_deportivo", children: "Uniforme Deportivo" }), _jsx("option", { value: "accesorios", children: "Accesorios" })] }), _jsx("p", { className: "text-xs text-gray-500 mt-1", children: "Opcional - Ayuda a organizar los productos" })] }), _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "flex items-center gap-3 p-3 bg-gray-50 rounded-lg", children: [_jsxs("label", { className: "relative inline-flex items-center cursor-pointer", children: [_jsx("input", { type: "checkbox", name: "requires_embroidery", checked: formData.requires_embroidery, onChange: (e) => setFormData({ ...formData, requires_embroidery: e.target.checked }), className: "sr-only peer" }), _jsx("div", { className: "w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500" })] }), _jsxs("div", { children: [_jsx("span", { className: "text-sm font-medium text-gray-700", children: "Requiere bordado" }), _jsx("p", { className: "text-xs text-gray-500", children: "Indica si los productos de este tipo necesitan personalizaci\u00F3n con bordado" })] })] }), _jsxs("div", { className: "flex items-center gap-3 p-3 bg-gray-50 rounded-lg", children: [_jsxs("label", { className: "relative inline-flex items-center cursor-pointer", children: [_jsx("input", { type: "checkbox", name: "has_custom_measurements", checked: formData.has_custom_measurements, onChange: (e) => setFormData({ ...formData, has_custom_measurements: e.target.checked }), className: "sr-only peer" }), _jsx("div", { className: "w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500" })] }), _jsxs("div", { children: [_jsx("span", { className: "text-sm font-medium text-gray-700", children: "Medidas personalizadas" }), _jsx("p", { className: "text-xs text-gray-500", children: "Indica si los productos requieren medidas espec\u00EDficas del cliente (ej: Yomber)" })] })] })] }), garmentType && (_jsxs("div", { className: "flex items-center gap-3 p-3 bg-gray-50 rounded-lg", children: [_jsxs("label", { className: "relative inline-flex items-center cursor-pointer", children: [_jsx("input", { type: "checkbox", name: "is_active", checked: formData.is_active, onChange: (e) => setFormData({ ...formData, is_active: e.target.checked }), className: "sr-only peer" }), _jsx("div", { className: "w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500" })] }), _jsxs("div", { children: [_jsx("span", { className: "text-sm font-medium text-gray-700", children: formData.is_active ? 'Tipo Activo' : 'Tipo Inactivo' }), _jsx("p", { className: "text-xs text-gray-500", children: formData.is_active
                                                        ? 'El tipo está visible y disponible para crear productos'
                                                        : 'El tipo está oculto y no se puede usar para nuevos productos' })] })] })), garmentType && !isGlobal && schoolId && (_jsxs("div", { className: "border-t border-gray-200 pt-4 mt-4", children: [_jsxs("div", { className: "flex items-center justify-between mb-3", children: [_jsxs("div", { children: [_jsxs("h3", { className: "text-sm font-medium text-gray-700 flex items-center gap-2", children: [_jsx(ImageIcon, { className: "w-4 h-4" }), "Im\u00E1genes del Tipo de Prenda"] }), _jsx("p", { className: "text-xs text-gray-500 mt-1", children: "Agrega fotos desde diferentes \u00E1ngulos para mostrar en el cat\u00E1logo web" })] }), _jsxs("span", { className: "text-xs text-gray-400", children: [images.length, "/10"] })] }), imageError && (_jsxs("div", { className: "flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-2 mb-3", children: [_jsx(AlertCircle, { className: "w-4 h-4 text-red-500 flex-shrink-0" }), _jsx("p", { className: "text-xs text-red-700", children: imageError }), _jsx("button", { type: "button", onClick: () => setImageError(null), className: "ml-auto text-red-400 hover:text-red-600", children: _jsx(X, { className: "w-3 h-3" }) })] })), imagesLoading ? (_jsxs("div", { className: "flex items-center justify-center py-8 bg-gray-50 rounded-lg", children: [_jsx(Loader2, { className: "w-5 h-5 animate-spin text-gray-400" }), _jsx("span", { className: "ml-2 text-sm text-gray-500", children: "Cargando im\u00E1genes..." })] })) : (_jsxs("div", { className: "grid grid-cols-4 gap-3", children: [images.map((image) => (_jsxs("div", { className: `relative aspect-square rounded-lg overflow-hidden border-2 ${image.is_primary ? 'border-yellow-400' : 'border-gray-200'} group`, children: [_jsx("img", { src: getImageUrl(image.image_url), alt: "Imagen del producto", className: "w-full h-full object-cover" }), _jsxs("div", { className: "absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100", children: [!image.is_primary && (_jsx("button", { type: "button", onClick: () => handleSetPrimary(image.id), className: "p-1.5 bg-white rounded-full shadow hover:bg-yellow-100 transition", title: "Establecer como principal", children: _jsx(Star, { className: "w-4 h-4 text-yellow-500" }) })), _jsx("button", { type: "button", onClick: () => handleDeleteImage(image.id), className: "p-1.5 bg-white rounded-full shadow hover:bg-red-100 transition", title: "Eliminar imagen", children: _jsx(Trash2, { className: "w-4 h-4 text-red-500" }) })] }), image.is_primary && (_jsxs("div", { className: "absolute top-1 left-1 bg-yellow-400 text-yellow-900 text-xs px-1.5 py-0.5 rounded font-medium flex items-center gap-1", children: [_jsx(Star, { className: "w-3 h-3", fill: "currentColor" }), "Principal"] }))] }, image.id))), images.length < 10 && (_jsx("button", { type: "button", onClick: () => fileInputRef.current?.click(), disabled: uploadingImage, className: "aspect-square rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition flex flex-col items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed", children: uploadingImage ? (_jsx(Loader2, { className: "w-6 h-6 animate-spin text-blue-500" })) : (_jsxs(_Fragment, { children: [_jsx(Upload, { className: "w-6 h-6 text-gray-400" }), _jsx("span", { className: "text-xs text-gray-500", children: "Agregar" })] })) }))] })), _jsx("input", { ref: fileInputRef, type: "file", accept: "image/jpeg,image/jpg,image/png,image/webp", onChange: handleFileSelect, className: "hidden" }), _jsx("p", { className: "text-xs text-gray-400 mt-2", children: "JPG, PNG o WebP \u2022 M\u00E1x 2MB \u2022 Click en \u2B50 para marcar como principal" })] })), _jsxs("div", { className: "flex gap-3 pt-4", children: [_jsx("button", { type: "button", onClick: onClose, disabled: loading, className: "flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition disabled:opacity-50", children: "Cancelar" }), _jsx("button", { type: "submit", disabled: loading, className: "flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center", children: loading ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "w-4 h-4 mr-2 animate-spin" }), "Guardando..."] })) : (garmentType ? 'Actualizar Tipo' : 'Crear Tipo de Prenda') })] })] })] }) })] }));
}
