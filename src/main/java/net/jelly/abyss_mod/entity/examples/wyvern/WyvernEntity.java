package net.jelly.abyss_mod.entity.examples.wyvern;

import net.jelly.abyss_mod.utility.FabrikAnimatable;
import net.jelly.abyss_mod.utility.FabrikAnimator;
import net.minecraft.client.Minecraft;
import net.minecraft.network.chat.Component;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.ai.attributes.AttributeSupplier;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.minecraft.world.entity.animal.Animal;
import net.minecraft.world.entity.monster.Phantom;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.level.Level;
import net.minecraftforge.entity.PartEntity;
import org.jetbrains.annotations.Nullable;

public class WyvernEntity extends Phantom implements FabrikAnimatable {
    private final WyvernPartEntity[] allParts;
    FabrikAnimator animator;

    public WyvernEntity(EntityType entityType, Level level) {
        super(entityType, level);
        WyvernPartEntity tail1Part = new WyvernPartEntity(this, 0.5F, 0.5F, 0.5f);
        WyvernPartEntity tail2Part = new WyvernPartEntity(this, 0.5F, 0.5F, 0.5f);
        WyvernPartEntity tail3Part = new WyvernPartEntity(this, 0.5F, 0.5F, 0.5f);
        WyvernPartEntity tail4Part = new WyvernPartEntity(this, 0.5F, 0.5F, 0.5f);
        WyvernPartEntity tail5Part = new WyvernPartEntity(this, 0.5F, 0.5F, 0.5f);
        WyvernPartEntity tail6Part = new WyvernPartEntity(this, 0.5F, 0.5F, 0.5f);
        WyvernPartEntity tail7Part = new WyvernPartEntity(this, 0.5F, 0.5F, 0.5f);
        WyvernPartEntity tail8Part = new WyvernPartEntity(this, 0.5F, 0.5F, 0.5f);
        WyvernPartEntity tail9Part = new WyvernPartEntity(this, 0.5F, 0.5F, 0.5f);
        WyvernPartEntity tail10Part = new WyvernPartEntity(this, 0.5F, 0.5F, 0.5f);
        allParts = new WyvernPartEntity[]{tail1Part, tail2Part, tail3Part, tail4Part, tail5Part, tail6Part, tail7Part, tail8Part, tail9Part, tail10Part};
        animator = new FabrikAnimator(this, allParts);
        animator.setFollowRootOnly(true);
    }

    @Override
    public FabrikAnimator getAnimator() {
        return animator;
    }
    @Override
    public boolean isMultipartEntity() {
        return true;
    }

    @Override
    public @Nullable PartEntity<?>[] getParts() {
        return allParts;
    }

    public void remove(RemovalReason removalReason) {
        super.remove(removalReason);
        if (allParts != null) {
            for (PartEntity part : allParts) {
                part.remove(RemovalReason.KILLED);
            }
        }
    }

    public void tick() {
        super.tick();
        Player nearestPlayer = this.level().getNearestPlayer(this, 200);
        if(nearestPlayer != null) setFabrikTarget(nearestPlayer.position());
        tickMultipart();
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
    protected boolean isSunBurnTick() {
        return false;
    }

    @Override
    protected InteractionResult mobInteract(Player pPlayer, InteractionHand pHand) {
        if(this.level().isClientSide) Minecraft.getInstance().player.sendSystemMessage(Component.literal("squelch client"));
        else Minecraft.getInstance().player.sendSystemMessage(Component.literal("squelch server"));
        return super.mobInteract(pPlayer, pHand);
    }
}
