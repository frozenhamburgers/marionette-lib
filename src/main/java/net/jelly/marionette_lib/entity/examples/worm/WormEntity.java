package net.jelly.marionette_lib.entity.examples.worm;

import net.jelly.marionette_lib.utility.Limb;
import net.jelly.marionette_lib.utility.Marionette;
import net.jelly.marionette_lib.utility.MarionettePart;
import net.minecraft.client.Minecraft;
import net.minecraft.network.chat.Component;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.ai.attributes.AttributeSupplier;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.minecraft.world.entity.animal.Animal;
import net.minecraft.world.entity.animal.WaterAnimal;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.level.Level;
import net.minecraftforge.entity.PartEntity;

import java.util.List;

public class WormEntity extends WaterAnimal implements Marionette {
    private final Limb<MarionettePart<WormEntity>> tail;

    public WormEntity(EntityType entityType, Level level) {
        super(entityType, level);
        tail = Limb.builder(this)
                .segments(10, 0.5f, 0.5f, 2f / 8)
                .build();
    }

    @Override
    public List<Limb<?>> getLimbs() {
        return List.of(tail);
    }

    @Override
    public boolean isMultipartEntity() {
        return true;
    }

    @Override
    public PartEntity<?>[] getParts() {
        return getMarionetteParts();
    }

    @Override
    public void remove(RemovalReason removalReason) {
        super.remove(removalReason);
        removeMarionette(removalReason);
    }

    public void tick() {
        super.tick();
        Player nearestPlayer = this.level().getNearestPlayer(this, 200);
        if (nearestPlayer != null) tail.animator().setFabrikTarget(nearestPlayer.position());
        tickMarionette();
    }

    public static AttributeSupplier.Builder createAttributes() {
        return Animal.createLivingAttributes()
                .add(Attributes.MAX_HEALTH, 20D)
                .add(Attributes.FOLLOW_RANGE, 24D)
                .add(Attributes.MOVEMENT_SPEED, 0.25D)
                .add(Attributes.ARMOR_TOUGHNESS, 0.1f)
                .add(Attributes.ATTACK_KNOCKBACK, 0.5f)
                .add(Attributes.ATTACK_DAMAGE, 2f);
    }

    @Override
    protected InteractionResult mobInteract(Player pPlayer, InteractionHand pHand) {
        if (this.level().isClientSide) Minecraft.getInstance().player.sendSystemMessage(Component.literal("squelch client"));
        else Minecraft.getInstance().player.sendSystemMessage(Component.literal("squelch server"));
        return super.mobInteract(pPlayer, pHand);
    }
}
