package net.jelly.abyss_mod.networking;

import net.minecraft.client.Minecraft;
import net.minecraft.network.FriendlyByteBuf;
import net.minecraft.world.damagesource.DamageSource;
import net.minecraft.world.damagesource.DamageSources;
import net.minecraft.world.damagesource.DamageType;
import net.minecraft.world.damagesource.DamageTypes;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.level.Level;
import net.minecraftforge.network.NetworkEvent;

import java.util.function.Supplier;


public class HurtMainBodyC2S {
    private final int entityID; // Persistent ID of the entity
    private float amount; // amount of damage dealt to entity

    // Constructor for creating the packet
    public HurtMainBodyC2S(int entityID, float amount) {
        this.entityID = entityID;
        this.amount = amount;
    }

    // Constructor for deserialization
    public HurtMainBodyC2S(FriendlyByteBuf buf) {
        this.entityID = buf.readInt(); // Read the entity ID from the buffer
        this.amount = buf.readFloat();
//        System.out.println("Packet received on client with entity ID: " + this.entityID);
    }

    // Serialization method
    public void toBytes(FriendlyByteBuf buf) {
        buf.writeInt(this.entityID); // Write the entity ID to the buffer
        buf.writeFloat(this.amount);
//        System.out.println("Packet sent from server with entity ID: " + this.entityID);
    }

    // Handle the packet on the client side
    public boolean handle(Supplier<NetworkEvent.Context> supplier) {
        NetworkEvent.Context context = supplier.get();
//        System.out.println("Packet handling started on client"); // Debug message
        context.enqueueWork(() -> {
            // HERE WE ARE ON THE CLIENT!
            Level level = Minecraft.getInstance().player.level(); // Get the client world

            // Find the entity by its persistent ID
            Entity entity = level.getEntity(this.entityID);

            if (entity != null) {
//                entity.hurt(new DamageSource(DamageTypes), amount);
            } else {
                System.out.println("Entity not found on client with ID: " + this.entityID);
            }
        });
        context.setPacketHandled(true); // Mark the packet as handled
        return true;
    }
}