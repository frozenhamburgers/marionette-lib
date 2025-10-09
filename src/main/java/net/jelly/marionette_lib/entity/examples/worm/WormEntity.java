package net.jelly.marionette_lib.entity.examples.worm;

import net.jelly.marionette_lib.utility.ProceduralAnimatable;
import net.jelly.marionette_lib.utility.FabrikAnimator;
import net.minecraft.client.Minecraft;
import net.minecraft.network.chat.Component;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.ai.attributes.AttributeSupplier;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.minecraft.world.entity.animal.Animal;
import net.minecraft.world.entity.animal.WaterAnimal;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.level.Level;
import net.minecraftforge.entity.PartEntity;
import org.jetbrains.annotations.Nullable;

import java.util.ArrayList;

public class WormEntity extends WaterAnimal implements ProceduralAnimatable {
    private final WormPartEntity[] allParts;
    FabrikAnimator animator;

    public WormEntity(EntityType entityType, Level level) {
        super(entityType, level);
        WormPartEntity tail1Part = new WormPartEntity(this, 0.5F, 0.5F, 2f/8);
        WormPartEntity tail2Part = new WormPartEntity(this, 0.5F, 0.5F, 2f/8);
        WormPartEntity tail3Part = new WormPartEntity(this, 0.5F, 0.5F, 2f/8);
        WormPartEntity tail4Part = new WormPartEntity(this, 0.5F, 0.5F, 2f/8);
        WormPartEntity tail5Part = new WormPartEntity(this, 0.5F, 0.5F, 2f/8);
        WormPartEntity tail6Part = new WormPartEntity(this, 0.5F, 0.5F, 2f/8);
        WormPartEntity tail7Part = new WormPartEntity(this, 0.5F, 0.5F, 2f/8);
        WormPartEntity tail8Part = new WormPartEntity(this, 0.5F, 0.5F, 2f/8);
        WormPartEntity tail9Part = new WormPartEntity(this, 0.5F, 0.5F, 2f/8);
        WormPartEntity tail10Part = new WormPartEntity(this, 0.5F, 0.5F, 2f/8);
        allParts = new WormPartEntity[]{tail1Part, tail2Part, tail3Part, tail4Part, tail5Part, tail6Part, tail7Part, tail8Part, tail9Part, tail10Part};
        animator = new FabrikAnimator(this, allParts);
    }

    @Override
    public ArrayList<FabrikAnimator> getAnimators() {
        ArrayList<FabrikAnimator> animators = new ArrayList<>();
        animators.add(animator);
        return animators;
    }
    @Override
    public boolean isMultipartEntity() {
        return true;
    }

    @Override
    public @Nullable PartEntity<?>[] getParts() {
        return allParts;
    }

    public void remove(Entity.RemovalReason removalReason) {
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
        if(nearestPlayer != null) animator.setFabrikTarget(nearestPlayer.position());
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
    protected InteractionResult mobInteract(Player pPlayer, InteractionHand pHand) {
        if(this.level().isClientSide) Minecraft.getInstance().player.sendSystemMessage(Component.literal("squelch client"));
        else Minecraft.getInstance().player.sendSystemMessage(Component.literal("squelch server"));
        return super.mobInteract(pPlayer, pHand);
    }
}
