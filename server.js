const express = require("express");
const cors = require("cors");
const { MercadoPagoConfig, Preference } = require("mercadopago");

// 1. TUS CREDENCIALES DE PRODUCCIÓN
const client = new MercadoPagoConfig({
    accessToken: process.env.MP_ACCESS_TOKEN,
});
const app = express();
const port = process.env.PORT || 3000;

// --- CONFIGURACIÓN PRODUCCIÓN ---
const BASE_URL = "https://tiendaanila.netlify.app"; 

// --- CONFIGURACIÓN DE ENVÍO (PRECIO FIJO SEGURO) ---
const COSTO_ENVIO = 15000; 

app.use(cors());
app.use(express.json());

// --- BASE DE DATOS DE PRODUCTOS (Backend - Precios Oficiales) ---
const PRODUCTS_DB = [
    // --- MUJER (LISTA ACTUALIZADA) ---
    { id: 1, title: "REMERA CROP MORLEY ", price: 8000 },
    { id: 2, title: "MUSCULOSA LENCERA", price: 20000 },
    { id: 3, title: "BERMUDA DE LINO", price: 15000 },
    { id: 4, title: "BODY DE ALGODÓN", price: 8000 },
    { id: 5, title: "TOP LENCERO BÁSICO", price: 20000 },
    { id: 6, title: "REMERA HILO CROCHET", price: 35000 },
    { id: 7, title: "REMERA BRODERIE", price: 15000 },
    { id: 8, title: "SHORT LENCERO", price: 18000 },
    { id: 9, title: "REMERA CROP MORLEY ", price: 8000 },
    { id: 10, title: "LENCERA RASO PUNTILLA", price: 35000 },
    { id: 11, title: "REMERA BRILLOS STRASS", price: 15000 },
    { id: 12, title: "SHORT LENCERO ", price: 18000 },
    
    // --- NUEVOS AGREGADOS ---
    { id: 18, title: "CAMISA NEGRA", price: 25000 },
    { id: 19, title: "BLUSA LINO BORDADO", price: 18000 },
    { id: 20, title: "REMERA BOTONES ", price: 36000 },
    { id: 21, title: "REMERA BORDADA ", price: 45000 }
];

app.post("/create_preference", async (req, res) => {
    try {
        const { items, buyer, shippingCost, orderId } = req.body;

        if (!items || items.length === 0) return res.status(400).json({ error: "Carrito vacío" });

        // 1. Validar productos y precios contra la base de datos del servidor
        const itemsToBuy = items.map(item => {
            const product = PRODUCTS_DB.find(p => p.id === Number(item.id));
            
            if (!product) {
                console.warn(`Producto ID ${item.id} no encontrado en backend.`);
                // Fallback seguro por si un producto viejo quedó en caché
                return { 
                    id: "unknown", 
                    title: item.name || "Producto Desconocido", 
                    quantity: Number(item.qty), 
                    unit_price: 100, 
                    currency_id: "ARS" 
                };
            }

            return {
                id: product.id,
                title: product.title,
                quantity: Number(item.qty),
                unit_price: Number(product.price), // Usamos el precio SEGURO del backend
                currency_id: "ARS"
            };
        });

        // 2. Validar Envío (SEGURIDAD)
        // Si el frontend dice que el envío cuesta algo (mayor a 0), cobramos los $15.000 oficiales.
        // Si dice 0, asumimos retiro en local.
        const incomingShipping = Number(shippingCost) || 0;
        const finalShippingCost = incomingShipping > 0 ? COSTO_ENVIO : 0;

        const body = {
            items: itemsToBuy,
            payer: {
                email: buyer.email || "test_user_123@test.com",
                name: buyer.name || "Cliente",
                identification: { type: "DNI", number: buyer.dni || "11111111" }
            },
            shipments: {
                cost: finalShippingCost, // Aquí se aplica el costo validado
                mode: "not_specified",
            },
            external_reference: orderId, // Vinculamos con el pedido de Firebase
            
            back_urls: {
                success: `${BASE_URL}/perfil.html`,
                failure: `${BASE_URL}/checkout.html`,
                pending: `${BASE_URL}/perfil.html`
            },
            auto_return: "approved", 
        };

        const preference = new Preference(client);
        const result = await preference.create({ body });
        
        res.json({ id: result.id });

    } catch (error) {
        console.error("ERROR MP:", error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`SERVIDOR LISTO en puerto ${port}`);
});
